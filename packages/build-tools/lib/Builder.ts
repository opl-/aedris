import debug from 'debug';
import {promises as fs, Stats} from 'fs';
import path from 'path';
import {
	AsyncParallelHook, SyncWaterfallHook, SyncBailHook, AsyncSeriesHook,
} from 'tapable';
import {promisify} from 'util';
import webpack, {MultiCompiler, MultiWatching} from 'webpack';
import ChainedConfig from 'webpack-chain';

import {AedrisConfigHandler, AedrisPluginConfig} from './AedrisConfigHandler';
import {BuildTarget, TargetOptions} from './BuildTarget';

const log = debug('aedris:build-tools');

export interface AedrisPlugin {
	hookBuild(builder: Builder): void;
}

interface BuilderOptions {
	/** Path to the config file. */
	configPath?: string;

	/** Config object to be used instead of the config file. Takes precedence over the `configPath` option. */
	config?: AedrisPluginConfig;
}

interface PluginInfo {
	absolutePath: string;
	plugin: AedrisPlugin;
}

export class Builder {
	/** `true` if not building for production */
	isDevelopment: boolean = process.env.NODE_ENV !== 'production';

	configPath?: string;
	rawConfig?: AedrisPluginConfig;
	config: AedrisPluginConfig;

	registeredPlugins: {[pluginName: string]: PluginInfo};

	/** List of paths to modules that can have a varying path in the project. */
	dynamicAppModules: {[moduleName: string]: string} = {};

	webpackCompiler: MultiCompiler;
	webpackWatcher: MultiWatching;

	targets: BuildTarget[] = [];

	hooks = {
		afterRawConfig: new AsyncSeriesHook<Builder>(['builder']),
		normalizeConfig: new SyncWaterfallHook<AedrisPluginConfig>(['config']),
		afterConfig: new AsyncSeriesHook<Builder>(['builder']),
		registerTargets: new AsyncParallelHook<Builder>(['builder']),
		registerDynamicModules: new AsyncParallelHook<Builder>(['builder']),
		prepareWebpackConfig: new SyncWaterfallHook<ChainedConfig, BuildTarget>(['webpackConfig', 'target']),
		afterLoad: new AsyncSeriesHook<Builder>(['builder']),
		watchShouldIgnore: new SyncBailHook<string, Stats, undefined, boolean | undefined>(['filePath', 'stats']),
	};

	constructor(opts: BuilderOptions) {
		if (opts.config) {
			this.rawConfig = opts.config;

			if (!this.rawConfig.rootDir) throw new Error('No rootDir provided in the config');
		} else if (opts.configPath) {
			this.configPath = opts.configPath;
		} else {
			throw new Error('Config path or object has to be provided');
		}
	}

	async load(): Promise<Builder> {
		if (this.webpackCompiler) throw new Error('Builder instance already loaded');

		await this.loadRawConfig();

		await this.loadPlugins();

		log('Passing config to plugins');

		this.config = this.hooks.normalizeConfig.call(this.rawConfig);
		await this.hooks.afterConfig.promise(this);

		await this.registerDynamicModules();

		log('Creating targets');

		await this.hooks.registerTargets.promise(this);

		log('Creating webpack compiler');

		this.webpackCompiler = webpack(this.targets.map((v) => v.webpackConfig));

		log('Creating entry points');

		Object.values(this.targets).forEach((target) => {
			target.generateEntry();
		});

		await this.hooks.afterLoad.promise(this);

		log('Builder loaded');
		return this;
	}

	async loadRawConfig(): Promise<AedrisPluginConfig> {
		if (this.configPath) {
			log('Loading Builder using config %s', this.configPath);

			const tempConfig = await AedrisConfigHandler.loadConfig(this.configPath);
			if (tempConfig === false) throw new Error('Config could not be found');

			this.rawConfig = tempConfig;
		} else if (!this.rawConfig) {
			throw new Error('No path to config and no config object provided');
		} else {
			log('Using provided config');

			this.rawConfig = AedrisConfigHandler.normalizeConfig(this.rawConfig.rootDir, this.rawConfig);
		}

		await this.hooks.afterRawConfig.promise(this);

		return this.rawConfig;
	}

	async loadPlugins(): Promise<void> {
		if (!this.rawConfig) throw new Error('No config loaded while trying to load plugins');

		log('Registering %i plugins', this.rawConfig.plugins.length);

		this.registeredPlugins = {};
		// eslint-disable-next-line no-restricted-syntax
		for (const pluginName of this.rawConfig.plugins) {
			// eslint-disable-next-line no-await-in-loop
			await this.usePlugin(pluginName);
		}
	}

	async usePlugin(pluginName: string): Promise<void> {
		log('Using plugin %s', pluginName);

		if (!this.rawConfig) throw new Error('No config loaded while trying to use a plugin');

		// Don't load plugins twice
		if (this.registeredPlugins[pluginName]) return void log('  Already loaded (by name)');

		const pluginPath = require.resolve(pluginName, {
			paths: [
				this.rawConfig.rootDir,
			],
		});

		if (Object.values(this.registeredPlugins).some((info) => info.absolutePath === pluginPath)) return void log('  Already loaded (by path)');

		log('  Loading from %s', pluginPath);

		const aedrisPlugin: AedrisPlugin = (await import(pluginPath)).default;

		this.registeredPlugins[pluginName] = {
			absolutePath: pluginPath,
			plugin: aedrisPlugin,
		};

		// Call hook only if it exists
		if (aedrisPlugin && typeof aedrisPlugin.hookBuild === 'function') aedrisPlugin.hookBuild(this);
	}

	async registerDynamicModules() {
		this.dynamicAppModules = {};

		log('Registering dynamic modules');

		await this.hooks.registerDynamicModules.promise(this);

		log('Registered %i dynamic modules', Object.keys(this.dynamicAppModules).length);
	}

	setDynamicModule(dynamicModuleName: string, modulePath: string) {
		// TODO: webpack's resolve.alias might work here too and would be much less troublesome
		this.dynamicAppModules[dynamicModuleName] = modulePath;
	}

	getTarget(targetName: string): BuildTarget | null {
		return this.targets.find((t) => t.name === targetName) || null;
	}

	// TODO: why is this async?
	async createTarget(opts: TargetOptions): Promise<BuildTarget> {
		log('Creating target %s with context %s', JSON.stringify(opts.name), JSON.stringify(opts.context));

		if (this.getTarget(opts.name)) throw new Error(`Tried to create Target with duplicate name ${JSON.stringify(opts.name)}`);

		const target = new BuildTarget(this, opts);

		target.createConfig();

		this.targets.push(target);

		return target;
	}

	async clearOutputs(): Promise<void> {
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
		await this.clearOutputs();

		await promisify(this.webpackCompiler.run.bind(this.webpackCompiler))();
	}

	async watch(): Promise<void> {
		await this.clearOutputs();

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
