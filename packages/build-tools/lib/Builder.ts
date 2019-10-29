import debug from 'debug';
import {Stats} from 'fs';
import path from 'path';
import {
	AsyncParallelHook, SyncHook, SyncWaterfallHook, SyncBailHook,
} from 'tapable';
import {promisify} from 'util';
import webpack, {MultiCompiler, MultiWatching} from 'webpack';
import ChainedConfig from 'webpack-chain';

import {AedrisConfigHandler, AedrisPluginConfig} from './AedrisConfigHandler';
import {BuildTarget, TargetOptions} from './BuildTarget';

// TODO: clear output directories, making sure they are inside the app root and that they aren't the drive root

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

	rootDir: string;
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
		normalizeConfig: new SyncWaterfallHook<AedrisPluginConfig>(['config']),
		registerTargets: new AsyncParallelHook<Builder>(['builder']),
		registerDynamicModules: new AsyncParallelHook<Builder>(['builder']),
		prepareWebpackConfig: new SyncWaterfallHook<ChainedConfig, BuildTarget>(['webpackConfig', 'target']),
		// TODO: still not sure about this name but it's better than `postLoad` and matches webpack convention
		afterLoad: new SyncHook<Builder>(['builder']),
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

		if (this.configPath) {
			log('Loading Builder using config %s', this.configPath);

			const tempConfig = await AedrisConfigHandler.loadConfig(this.configPath);
			if (tempConfig === false) throw new Error('Config could not be found');

			this.rawConfig = tempConfig;
		} else if (!this.rawConfig) {
			throw new Error('No path to config and no config object provided');
		} else {
			log('Using provided config');

			this.rawConfig = AedrisConfigHandler.normalizeConfig(this.rawConfig.rootDir, this.rawConfig as AedrisPluginConfig);
		}

		await this.loadPlugins();

		log('Passing config to plugins');

		this.config = this.hooks.normalizeConfig.call(this.rawConfig);

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

	async loadPlugins(): Promise<void> {
		if (!this.rawConfig) throw new Error('No config loaded while trying to load plugins');

		log('Registering %i plugins', this.rawConfig.plugins.length);

		this.registeredPlugins = {};
		// eslint-disable-next-line no-restricted-syntax
		for (const pluginName of this.rawConfig.plugins) {
			const pluginPath = require.resolve(pluginName, {
				paths: [
					this.rawConfig.rootDir,
				],
			});

			// eslint-disable-next-line no-await-in-loop
			const aedrisPlugin: AedrisPlugin = (await import(pluginPath)).default;

			this.registeredPlugins[pluginName] = {
				absolutePath: pluginPath,
				plugin: aedrisPlugin,
			};

			// Call hook only if it exists
			if (aedrisPlugin && typeof aedrisPlugin.hookBuild === 'function') aedrisPlugin.hookBuild(this);
		}
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

	async build(): Promise<void> {
		await promisify(this.webpackCompiler.run.bind(this.webpackCompiler))();
	}

	async watch(): Promise<void> {
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
