import path from 'path';

export interface AedrisModuleConfig {
	/** `true` if this config has been normalized. */
	aedrisNormalized?: boolean;

	// TODO: make use of this
	/** If `true` this config describes an Aedris module. This changes the build configuration. */
	isModule: boolean;

	/** Root directory of the project. All relative paths are resolved from this directory. Defaults to the location of the config. */
	rootDir: string;
	/** Root directory of the frontend. Should be relative to the `rootDir`. Defaults to `./frontend`. */
	frontendDir: string;
	/** Root directory of the backend. Should be relative to the `rootDir`. Defaults to `./backend`. */
	backendDir: string;

	/** Output directory for the build artifacts. Should be relative to the `rootDir`. Defaults to `./dist`. */
	outputDir: string;

	/** Array of modules to register. Modules can be passed either in the form of a package name or a file path relative to the config file. */
	modules: string[];
}

export interface AedrisAppConfig extends AedrisModuleConfig {
	/** URL from which the assets will be served. See https://webpack.js.org/configuration/output/#outputpublicpath */
	publicPath: string;
}

export function isAppConfig(config: {[prop: string]: any}): config is AedrisAppConfig {
	return !config.isModule;
}

export class AedrisConfigHandler {
	static async loadConfig(configPath: string): Promise<AedrisModuleConfig | false> {
		try {
			// eslint-disable-next-line global-require, import/no-dynamic-require
			const configData = require(configPath);

			// TODO: actually verify the config

			return AedrisConfigHandler.normalizeConfig(path.dirname(configPath), configData as AedrisModuleConfig);
		} catch (ex) {
			if (ex.code === 'ENOENT') {
				return false;
			}

			throw ex;
		}
	}

	// TODO: this method should take in an object type and return the config type
	/**
	 * Normalizes the passed config, resolving relative paths. Returned object is a clone of the original.
	 *
	 * @param configDir Absolute path of the directory containing the config used for resolving relative paths
	 * @param originalConfig Config to normalize
	 * @returns A cloned config object with resolved paths
	 */
	static normalizeConfig<T extends AedrisModuleConfig | AedrisAppConfig>(configDir: string, originalConfig: T): T {
		const config = this.deepClone(originalConfig) as T;

		// Don't normalize the config twice
		if (config.aedrisNormalized) return config;
		config.aedrisNormalized = true;

		// Use the config path as root if needed
		if (!config.rootDir) config.rootDir = configDir;
		else config.rootDir = this.resolvePath(configDir, config.rootDir, 'rootDir');

		// Normalize project directories
		config.frontendDir = this.resolvePath(config.rootDir, config.frontendDir || './frontend', 'frontendDir');
		config.backendDir = this.resolvePath(config.rootDir, config.backendDir || './backend', 'backendDir');
		config.outputDir = this.resolvePath(config.rootDir, config.outputDir || './dist', 'outputDir');

		// Normalize module list
		if (!Array.isArray(config.modules)) config.modules = [];

		if (isAppConfig(config)) {
			if (config.publicPath) config.publicPath = config.publicPath || '/_/res/';
		}

		return config;
	}

	static resolvePath(rootDir: string, relativePath: string, propName: string, encourageRelative = true): string {
		if (!path.isAbsolute(relativePath)) return path.resolve(rootDir, relativePath);

		if (encourageRelative) console.warn(`${propName} is not relative. It is recommended not to use absolute paths to ensure code can be easily transferred between devices. Relative paths are resolved relative to the rootDir.`);

		return relativePath;
	}

	static deepClone(obj: any): any {
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
