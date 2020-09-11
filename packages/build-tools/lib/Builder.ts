import debug from 'debug';
import {promises as fs, Stats} from 'fs';
import path from 'path';
import {AsyncParallelHook, SyncWaterfallHook, AsyncSeriesHook} from 'tapable';
import {promisify} from 'util';
import webpack, {MultiCompiler, MultiWatching} from 'webpack';
import ChainConfig from 'webpack-chain';

import {AedrisConfigHandler, AedrisConfigHandlerOptions, AedrisPluginConfig} from './AedrisConfigHandler';
import {AedrisPlugin} from './AedrisPlugin';
import {BuildTarget, TargetOptions} from './BuildTarget';
import {PluginManager} from './PluginManager';

const log = debug('aedris:build-tools');

export type WebpackConfigCreator = (config: ChainConfig, target: BuildTarget) => ChainConfig;

interface BuilderOptions extends AedrisConfigHandlerOptions {}

export class Builder extends PluginManager<AedrisPlugin> {
	/** `true` if not building for production */
	isDevelopment: boolean = process.env.NODE_ENV !== 'production';

	configHandler: AedrisConfigHandler;

	webpackCompiler: MultiCompiler;
	webpackWatcher: MultiWatching;

	targets: BuildTarget[] = [];

	hooks = {
		/**
		 * Called after a "raw" Aedris config has been loaded and normalized. The plugin options are not normalized yet, nor have any plugins been loaded.
		 *
		 * Used internally to build local plugins and rewrite their paths to the built files.
		 */
		afterRawConfig: new AsyncSeriesHook<Builder>(['builder']),
		/**
		 * Called after the plugins were loaded and their options were normalized through the `AedrisPlugin.normalizeOptions` method.
		 *
		 * This is the last place where the config should be modified. Doing otherwise might result in unexpected behavior.
		 */
		normalizeConfig: new SyncWaterfallHook<AedrisPluginConfig>(['config']),
		/**
		 * Called when the config is fully loaded and normalized by both Aedris and loaded plugins.
		 *
		 * At this point the config is not meant to change, meaning that plugins can use other plugins' options to alter their own behavior.
		 */
		afterConfig: new AsyncSeriesHook<Builder>(['builder']),
		/** Called to register Build Targets. */
		registerTargets: new AsyncParallelHook<Builder>(['builder']),
		/** Called after the Build Targets have been prepared and the Builder is ready to enter build or watch mode. */
		afterLoad: new AsyncSeriesHook<Builder>(['builder']),
		beforeClean: new AsyncSeriesHook<Builder>(['builder']),
		afterClean: new AsyncSeriesHook<Builder>(['builder']),
		beforeWatch: new AsyncSeriesHook<Builder>(['builder']),
		beforeBuild: new AsyncSeriesHook<Builder>(['builder']),
		afterBuild: new AsyncSeriesHook<Builder, webpack.Stats>(['builder', 'stats']),
	};

	constructor(opts: BuilderOptions) {
		super();

		this.configHandler = new AedrisConfigHandler(opts);
	}

	get config() {
		return this.configHandler.config;
	}

	getPluginOptions(pluginRef: string): unknown {
		// TODO: resolve plugin ref
		return this.config.options[pluginRef];
	}

	async load(): Promise<Builder> {
		if (this.webpackCompiler) throw new Error('Builder instance already loaded');

		await this.loadConfig();

		await this.loadPluginsFromConfig();

		log('Passing config to plugins');
		Object.entries(this.registeredPlugins).forEach(([pluginName, info]) => {
			if (!info.plugin.normalizeOptions) return;

			// TODO: resolve local plugin names
			this.config.options[pluginName] = info.plugin.normalizeOptions(this.config.options[pluginName], this.config);
		});

		this.configHandler.config = this.hooks.normalizeConfig.call(this.config);

		// The config is now fully normalized for plugins to use
		await this.hooks.afterConfig.promise(this);

		log('Creating targets');
		await this.hooks.registerTargets.promise(this);

		if (this.targets.length === 0) {
			throw new Error('Builder loaded with no targets. Aborting.');
		}

		log('Creating webpack compiler');
		this.webpackCompiler = webpack(this.targets.map((v) => v.webpackConfig));

		// Assign the individual targets their compiler instance and let them finalize setup
		await Promise.all(this.targets.map((target, index) => target.setWebpackCompiler(this.webpackCompiler.compilers[index])));

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

	// eslint-disable-next-line consistent-return
	async doApplyPlugin(plugin: AedrisPlugin): Promise<any> {
		// Call hook only if it exists
		if (typeof plugin?.hookBuild === 'function') return plugin.hookBuild(this);
	}

	getTarget(targetName: string): BuildTarget | null {
		return this.targets.find((t) => t.name === targetName) || null;
	}

	async createTarget(opts: TargetOptions): Promise<BuildTarget> {
		log('Creating target %j with context %j', opts.name, opts.context);

		if (this.getTarget(opts.name)) throw new Error(`Tried to create Target with duplicate name ${JSON.stringify(opts.name)}`);

		const target = new BuildTarget(this, opts);

		// FIXME: hookTarget acts different than tools and builder hooks due to not being managed by a PluginManager. making targets reload the plugins would allow standardized behavior and independent builds (multithreading) at the expense of longer load times and memory usage
		log('Calling plugin hooks for target %j', target.name);
		await Promise.all(Object.values(this.registeredPlugins).map((info) => {
			if (typeof info.plugin?.hookTarget === 'function') return info.plugin.hookTarget(target);

			return Promise.resolve();
		}));

		await target.load();

		this.targets.push(target);

		return target;
	}

	async cleanOutputs(): Promise<void> {
		await this.hooks.beforeClean.promise(this);

		// Remove the output directory specified in the config
		const outputDirectories = ([this.config.outputDir] as (string | undefined)[])
			// Add output directories from all targets, as those might be outside of the output dir from config
			.concat(this.targets.map((t) => t.webpackConfig?.output?.path))
			// Remove falsy values and paths that are the drive root
			.filter((p) => p && path.resolve(p, '..') !== p)
			// Remove duplicates
			.filter((p, index, arr) => !arr.slice(0, index).includes(p)) as string[];

		if (process.env.AEDRIS_SIMULATE) {
			console.log('Would remove:', outputDirectories);
		} else {
			await Promise.all(outputDirectories.map((dir) => fs.rmdir(dir, {
				recursive: true,
			})));
		}

		await this.hooks.afterClean.promise(this);
	}

	async build(): Promise<webpack.Stats> {
		await this.cleanOutputs();

		await this.hooks.beforeBuild.promise(this);

		const stats = await promisify(this.webpackCompiler.run.bind(this.webpackCompiler) as MultiCompiler['run'])();

		await this.hooks.afterBuild.promise(this, stats);

		return stats;
	}

	async watch(): Promise<void> {
		await this.cleanOutputs();

		await this.hooks.beforeWatch.promise(this);

		this.webpackWatcher = this.webpackCompiler.watch({
			aggregateTimeout: 500,
			ignored: [
				// node_modules is too big to watch
				/\/node_modules/,
				// New output files should not trigger rebuilds
				// TODO: per target config
				path.join(this.config.outputDir, '**'),
				// Allow plugins to ignore files
				(filePath, stats) => Object.values(this.targets).some((target) => !!target.hooks.watchShouldIgnore.call(filePath, stats as unknown as Stats)),
			],
		}, () => {});
	}
}
