import debug from 'debug';
import {AsyncParallelHook, SyncHook, SyncWaterfallHook} from 'tapable';
import {promisify} from 'util';
import webpack, {Configuration, MultiCompiler, MultiWatching} from 'webpack';

import {AedrisConfigHandler, AedrisModuleConfig} from './AedrisConfigHandler';
import {BuildTarget, TargetOptions} from './BuildTarget';

// TODO: clear output directories, making sure they are inside the app root and that they aren't the drive root

const log = debug('aedris:build-tools');

export interface AedrisModule {
	hookBuild(builder: Builder): void;
}

interface BuilderOptions {
	/** Path to the config file. */
	configPath?: string;

	/** Config object to be used instead of the config file. Takes precedence over the `configPath` option. */
	config?: AedrisModuleConfig;
}

interface ModuleInfo {
	absolutePath: string;
	module: AedrisModule;
}

export class Builder {
	/** `true` if not building for production */
	isDevelopment: boolean = process.env.NODE_ENV !== 'production';

	rootDir: string;
	configPath?: string;
	rawConfig?: AedrisModuleConfig;
	config: AedrisModuleConfig;

	registeredModules: {[moduleName: string]: ModuleInfo};

	// TODO: i don't like the name "dynamic modules". it's too close to aedris modules. maybe aedris modules should be renamed to plugins? seems like a more obvious name, tbh
	/** List of paths to modules that can have a varying path in the project. */
	projectDynamicModules: {[moduleName: string]: string} = {};

	webpackCompiler: MultiCompiler;
	webpackWatcher: MultiWatching;

	targets: BuildTarget[] = [];

	hooks = {
		normalizeConfig: new SyncWaterfallHook<AedrisModuleConfig>(['config']),
		registerTargets: new AsyncParallelHook<Builder>(['builder']),
		registerDynamicModules: new AsyncParallelHook<Builder>(['builder']),
		prepareWebpackConfig: new SyncWaterfallHook<Configuration, BuildTarget>(['webpackConfig', 'target']),
		// TODO: still not sure about this name but it's better than `postLoad` and matches webpack convention
		afterLoad: new SyncHook<Builder>(['builder']),
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

			this.rawConfig = AedrisConfigHandler.normalizeConfig(this.rawConfig.rootDir, this.rawConfig as AedrisModuleConfig);
		}

		await this.loadModules();

		log('Passing config to modules');

		this.config = this.hooks.normalizeConfig.call(this.rawConfig);

		log('Creating targets');

		await this.hooks.registerTargets.promise(this);

		await this.linkDynamicModules();

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

	async loadModules(): Promise<void> {
		if (!this.rawConfig) throw new Error('No config loaded while trying to load modules');

		log('Registering %i modules', this.rawConfig.modules.length);

		this.registeredModules = {};
		// eslint-disable-next-line no-restricted-syntax
		for (const moduleName of this.rawConfig.modules) {
			const modulePath = require.resolve(moduleName, {
				paths: [
					this.rawConfig.rootDir,
				],
			});

			// eslint-disable-next-line no-await-in-loop
			const aedrisModule: AedrisModule = (await import(modulePath)).default;

			this.registeredModules[moduleName] = {
				absolutePath: modulePath,
				module: aedrisModule,
			};

			// Call hook only if it exists
			if (aedrisModule && typeof aedrisModule.hookBuild === 'function') aedrisModule.hookBuild(this);
		}
	}

	async linkDynamicModules() {
		this.projectDynamicModules = {};

		log('Registering dynamic modules');

		await this.hooks.registerDynamicModules.promise(this);

		log('Registered %i dynamic modules', Object.keys(this.projectDynamicModules).length);
	}

	setDynamicModule(dynamicModuleName: string, modulePath: string) {
		// TODO: webpack's resolve.alias might work here too and would be much less troublesome
		this.projectDynamicModules[dynamicModuleName] = modulePath;
	}

	// TODO: why is this async?
	async createTarget(opts: TargetOptions): Promise<BuildTarget> {
		log('Creating target with context %s', opts.context);

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
			ignored: /\/node_modules/,
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
