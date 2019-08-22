const path = require('path');

const {AEDRIS_APP_CONFIG} = process.env;

// TODO: use working dir when not provided?
if (typeof AEDRIS_APP_CONFIG !== 'string' || !path.isAbsolute(AEDRIS_APP_CONFIG)) {
	throw new Error(`AEDRIS_APP_CONFIG must be an absolute path (current: ${JSON.stringify(AEDRIS_APP_CONFIG)})`);
}

// eslint-disable-next-line import/no-dynamic-require
const appConfig = require(AEDRIS_APP_CONFIG);
const appRoot = path.resolve(AEDRIS_APP_CONFIG, '..');

function resolvePath(p, def) {
	if (p && p.startsWith('/')) return p;
	if (!p && def && def.startsWith('/')) return def;

	return path.resolve(appRoot, p || def);
}

module.exports = {
	/** Path to the Aedris app config. */
	appConfigPath: AEDRIS_APP_CONFIG,
	/**
	 * Resolves path relative to `appRoot`.
	 *
	 * @param String Path to resolve
	 * @param String Default path to use if path is missing
	 */
	resolvePath,
	appConfig: {
		...appConfig,
		appComponentPath: resolvePath(appConfig.appComponentPath, 'client/App'),
		routeDirectory: resolvePath(appConfig.routeDirectory, 'client/routes'),
	},
	/** The directory in which Aedris app config resides. */
	appRoot,
	/** Build output directory. */
	distDir: path.resolve(appRoot, 'dist'),
};
