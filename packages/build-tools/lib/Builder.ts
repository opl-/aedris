import debug from 'debug';
import {promises as fs, Stats} from 'fs';
import path from 'path';
import {
	AsyncParallelHook, SyncHook, SyncWaterfallHook, SyncBailHook, AsyncSeriesHook,
} from 'tapable';
import {promisify} from 'util';
import webpack, {MultiCompiler, MultiWatching} from 'webpack';
import ChainConfig from 'webpack-chain';

import {AedrisConfigHandler, AedrisConfigHandlerOptions, AedrisPluginConfig} from './AedrisConfigHandler';
import AedrisPlugin from './AedrisPlugin';
import {BuildTarget, TargetOptions} from './BuildTarget';
import PluginManager from './PluginManager';
import webpackConfigNode from './webpack-config/webpack.node';
import webpackConfigWeb from './webpack-config/webpack.web';

const log = debug('aedris:build-tools');

export enum DefaultContext {
	NODE = 'node',
	WEB = 'web',
}

export type WebpackConfigCreator = (config: ChainConfig, target: BuildTarget) => ChainConfig;

interface BuilderOptions extends AedrisConfigHandlerOptions {}

export class Builder extends PluginManager<AedrisPlugin> {
	contextToConfigCreatorMap: Record<string, WebpackConfigCreator> = {
		[DefaultContext.NODE]: webpackConfigNode,
		[DefaultContext.WEB]: webpackConfigWeb,
	};

	/** `true` if not building for production */
	isDevelopment: boolean = process.env.NODE_ENV !== 'production';

	configHandler: AedrisConfigHandler;

	/** List of paths to modules that can have a varying path in the project. */
	dynamicAppModules: {[moduleName: string]: string} = {};

	webpackCompiler: MultiCompiler;
	webpackWatcher: MultiWatching;

	targets: BuildTarget[] = [];

	hooks = {
		afterRawConfig: new AsyncSeriesHook<Builder>(['builder']),
		normalizeConfig: new SyncWaterfallHook<AedrisPluginConfig>(['config']),
		afterConfig: new AsyncSeriesHook<Builder>(['builder']),
		registerContexts: new SyncHook<Builder>(['builder']),
		registerTargets: new AsyncParallelHook<Builder>(['builder']),
		registerDynamicModules: new AsyncParallelHook<Builder>(['builder']),
		prepareWebpackConfig: new SyncWaterfallHook<ChainConfig, BuildTarget>(['webpackConfig', 'target']),
		afterLoad: new AsyncSeriesHook<Builder>(['builder']),
		watchShouldIgnore: new SyncBailHook<string, Stats, undefined, boolean | undefined>(['filePath', 'stats']),
	};

	constructor(opts: BuilderOptions) {
		super();

		this.configHandler = new AedrisConfigHandler(opts);
	}

	get config() {
		return this.configHandler.config;
	}

	getPluginOptions<T>(pluginRef: string): T {
		// TODO: resolve plugin ref
		return this.config.options[pluginRef];
	}

	async load(): Promise<Builder> {
		if (this.webpackCompiler) throw new Error('Builder instance already loaded');

		await this.loadConfig();

		await this.loadPluginsFromConfig();

		log('Passing config to plugins');

		this.configHandler.config = this.hooks.normalizeConfig.call(this.config);

		Object.entries(this.registeredPlugins).forEach(([pluginName, info]) => {
			if (!info.plugin.normalizeOptions) return;

			// TODO: resolve local plugin names
			this.config.options[pluginName] = info.plugin.normalizeOptions(this.config.options[pluginName]);
		});

		// The config is now fully normalized for plugins to use
		await this.hooks.afterConfig.promise(this);

		this.hooks.registerContexts.call(this);

		await this.registerDynamicModules();

		log('Creating targets');

		await this.hooks.registerTargets.promise(this);

		log('Creating webpack compiler');

		this.webpackCompiler = webpack(this.targets.map((v) => v.webpackConfig));

		// Assign the individual targets their compiler instance
		this.targets.forEach((acc, index) => {
			acc.compiler = this.webpackCompiler.compilers[index];
		});

		log('Creating entry points');

		Object.values(this.targets).forEach((target) => {
			target.generateEntry();
		});

		await this.hooks.afterLoad.promise(this);

		log('Builder loaded');
		return this;
	}

	async loadConfig(): Promise<void> {
		await this.configHandler.loadConfig();

		await this.hooks.afterRawConfig.promise(this);
	}

	async loadPluginsFromConfig() {
		log('Loading plugins from config');

		if (!this.config) throw new Error('No config loaded while trying to load plugins from config');

		await this.loadPlugins(this.config.plugins, {
			resolvePaths: [
				// Try to resolve plugins from the project directory
				this.config.rootDir,
			],
		});
	}

	async doApplyPlugin(plugin: AedrisPlugin) {
		// Call hook only if it exists
		if (plugin && typeof plugin.hookBuild === 'function') await plugin.hookBuild(this);
	}

	async registerDynamicModules() {
		this.dynamicAppModules = {};

		log('Registering dynamic modules');

		await this.hooks.registerDynamicModules.promise(this);

		log('Registered %i dynamic modules', Object.keys(this.dynamicAppModules).length);
	}

	setDynamicModule(dynamicModuleName: string, modulePath: string) {
		this.dynamicAppModules[dynamicModuleName] = modulePath;
	}

	getTarget(targetName: string): BuildTarget | null {
		return this.targets.find((t) => t.name === targetName) || null;
	}

	// TODO: why is this async?
	async createTarget(opts: TargetOptions): Promise<BuildTarget> {
		log('Creating target %j with context %j', opts.name, opts.context);

		if (this.getTarget(opts.name)) throw new Error(`Tried to create Target with duplicate name ${JSON.stringify(opts.name)}`);

		const target = new BuildTarget(this, opts);

		target.createConfig();

		this.targets.push(target);

		return target;
	}

	registerContext(contextName: string, configCreator: WebpackConfigCreator) {
		log('Registering context %j', contextName);

		this.contextToConfigCreatorMap[contextName] = configCreator;
	}

	async cleanOutputs(): Promise<void> {
		// Remove the output directory specified in the config
		const outputDirectories = ([this.config.outputDir] as (string | undefined)[])
			// Add output directories from all targets, as those might be outside of the output dir from config
			.concat(this.targets.map((t) => t.webpackConfig?.output?.path))
			// Remove falsy values and paths that are the drive root
			.filter((p) => p && path.resolve(p, '..') !== p)
			// Remove duplicates
			.filter((p, index, arr) => !arr.slice(0, index).includes(p)) as string[];

		if (process.env.AEDRIS_SIMULATE) return void console.log('Would remove:', outputDirectories);

		await Promise.all(outputDirectories.map((dir) => fs.rmdir(dir, {
			recursive: true,
		})));
	}

	async build(): Promise<void> {
		await this.cleanOutputs();

		await promisify(this.webpackCompiler.run.bind(this.webpackCompiler))();
	}

	async watch(): Promise<void> {
		await this.cleanOutputs();

		this.webpackWatcher = this.webpackCompiler.watch({
			aggregateTimeout: 500,
			ignored: [
				// node_modules is too big to watch
				/\/node_modules/,
				// New output files should not trigger rebuilds
				// TODO: per target config
				path.join(this.config.outputDir, '**'),
				// Allow plugins to ignore files
				(filePath, stats) => !!this.hooks.watchShouldIgnore.call(filePath, stats as unknown as Stats),
			],
		}, (err, stats) => {
			if (err) {
				// TODO: fix this mess
				console.error(err.stack || err);
				if ((err as Error & {details?: string}).details) {
					console.error((err as Error & {details?: string}).details);
				}
				return;
			}

			const info = stats.toJson();

			if (stats.hasErrors()) {
				console.error(info.errors);
			}

			if (stats.hasWarnings()) {
				console.warn(info.warnings);
			}
		});
	}
}
