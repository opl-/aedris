import debug from 'debug';

import path from 'path';

const log = debug('aedris:build-tools:AedrisConfigHandler');

export interface AedrisPluginOptions {
	[pluginName: string]: any;
}

export interface AedrisPluginConfig {
	/** `true` if this config has been normalized. */
	aedrisNormalized?: boolean;

	/** If `true` this config describes an Aedris plugin. This changes the build configuration. */
	isPlugin: boolean;

	/** Root directory of the project. All relative paths are resolved from this directory. Defaults to the location of the config. */
	rootDir: string;

	/** Output directory for the build artifacts. Should be relative to the `rootDir`. Defaults to `./dist`. */
	outputDir: string;

	/** Array of plugins to register. Plugins can be passed either in the form of a package name or a file path relative to the config file. */
	plugins: string[];
	/** Object containing plugin configurations. */
	options: AedrisPluginOptions;
}

export interface AedrisAppConfig extends AedrisPluginConfig {
	/** URL from which the assets will be served. See https://webpack.js.org/configuration/output/#outputpublicpath */
	publicPath: string;
}

export interface AedrisConfigHandlerOptions {
	/** Path to the config file. */
	configPath?: string;

	/** Config object to be used instead of the config file from disk. Takes precedence over the `configPath` option. */
	config?: AedrisPluginConfig;
}

export function isAppConfig(config: {[prop: string]: any}): config is AedrisAppConfig {
	return !config.isPlugin;
}

export class AedrisConfigHandler {
	/** Path to the config file. `undefined` if using a passed in config object. */
	configPath?: string;

	/** Currently loaded, in case of file configs normalized, config. Overriden when config is reloaded if `configPath` is set. */
	userConfig?: AedrisPluginConfig;

	/** Normalized config object. Overriden when config is reloaded. */
	config: AedrisPluginConfig;

	constructor(opts: AedrisConfigHandlerOptions) {
		if (opts.config) {
			this.userConfig = opts.config;

			if (!this.userConfig.rootDir) throw new Error('No rootDir provided in the config object');
		} else if (opts.configPath) {
			this.configPath = opts.configPath;
		} else {
			throw new Error('Config path or object has to be provided');
		}
	}

	/**
	 * Normalizes the config, loading it from disk if a config path was provided or using the passed in config object.
	 */
	async loadConfig(): Promise<void> {
		if (this.configPath) {
			log('Loading config from %j', this.configPath);

			try {
				// eslint-disable-next-line global-require, import/no-dynamic-require
				this.userConfig = require(this.configPath);
			} catch (ex) {
				if (ex.code === 'ENOENT') throw new Error('Config at given path could not be found');

				throw ex;
			}

			// Vaguely check if what we received is an object
			if (!(this.userConfig instanceof Object) || Array.isArray(this.userConfig)) throw new Error('Config at given path is not an object');

			this.config = AedrisConfigHandler.normalizeConfig(path.dirname(this.configPath), this.userConfig);
		} else if (!this.userConfig) {
			throw new Error('No path to config and no config object provided');
		} else {
			log('Using provided config object');

			this.config = AedrisConfigHandler.normalizeConfig(this.userConfig.rootDir, this.userConfig);
		}
	}

	/**
	 * Normalizes the passed config, resolving relative paths. Returned object is a clone of the original.
	 *
	 * @param configDir Absolute path of the directory containing the config used for resolving relative paths
	 * @param originalConfig Config to normalize
	 * @returns A cloned config object with resolved paths
	 */
	static normalizeConfig<T extends AedrisPluginConfig>(configDir: string, originalConfig: Partial<T>): T {
		const config = this.deepClone(originalConfig) as T;

		// Don't normalize the config twice
		if (config.aedrisNormalized) return config;
		config.aedrisNormalized = true;

		// Use the config path as root if needed
		if (!config.rootDir) config.rootDir = configDir;
		else config.rootDir = this.resolvePath(configDir, config.rootDir, 'rootDir');

		// Normalize project directories
		config.outputDir = this.resolvePath(config.rootDir, config.outputDir || './dist', 'outputDir');

		// Normalize plugin list
		if (!Array.isArray(config.plugins)) config.plugins = [];

		// Normalize the plugin options object. Options for individual plugins are normalized later by the plugins themselves.
		config.options = config.options || {};

		if (isAppConfig(config)) {
			config.publicPath = config.publicPath || '/_/res/';
		}

		return config;
	}

	static resolvePath(rootDir: string, relativePath: string, propName: string, encourageRelative = true): string {
		if (!path.isAbsolute(relativePath)) return path.resolve(rootDir, relativePath);

		if (encourageRelative) console.warn(`${propName} is not relative. It is recommended not to use absolute paths to ensure code can be easily transferred between devices. Relative paths are resolved relative to the rootDir.`);

		return relativePath;
	}

	static deepClone(obj: any): any {
		if (obj instanceof Function) return obj;

		if (Array.isArray(obj)) return obj.map((elem) => this.deepClone(elem));

		if (obj instanceof Object) {
			return Object.entries(obj).reduce((acc, [key, value]) => {
				acc[key] = this.deepClone(value);
				return acc;
			}, {} as {[key: string]: any});
		}

		return obj;
	}
}
