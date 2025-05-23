import debug from 'debug';
import path from 'path';

import {AedrisConfigHandler, AedrisPluginConfig} from '../AedrisConfigHandler';
import {Builder} from '../Builder';
import {DefaultContext} from '../BuildTarget';

const HOOK_NAME = '@aedris/build-tools:buildLocalPlugins';
const LOCAL_PLUGIN_OUTPUT_DIR = './.cache/aedris/local-plugin/';

const log = debug('aedris:build-tools:BuildTask');

/**
 * Compiles local plugins written in TypeScript.
 *
 * @param config Config used to identify the local plugins. Will be modified to adjust the local plugin locations.
 * @param skipBuild Prevents the function from rebuilding the configs, making it only rewrite the plugin paths. Setting this to `true` may break the build if no compiled version of the script is cached.
 */
export async function buildLocalPlugins(config: AedrisPluginConfig, skipBuild = false) {
	if (config.plugins.length === 0) return;

	const localPluginPaths: string[] = [];

	// eslint-disable-next-line no-param-reassign
	config.plugins = config.plugins.map((plugin) => {
		if (!plugin.startsWith('.') || !plugin.endsWith('.ts')) return plugin;

		localPluginPaths.push(plugin);

		// Rewrite the local plugin path to point to the compiled plugin
		return path.resolve(LOCAL_PLUGIN_OUTPUT_DIR, path.dirname(plugin), `${path.basename(plugin, '.ts')}.js`);
	});

	log('Found %i local plugins', localPluginPaths.length);

	if (localPluginPaths.length > 0 && !skipBuild) {
		// Create a new Builder to build the local plugins
		const localPluginBuilder = new Builder({
			config: AedrisConfigHandler.normalizeConfig(config.rootDir, {
				isPlugin: true,
				outputDir: LOCAL_PLUGIN_OUTPUT_DIR,
			}),
		});

		localPluginBuilder.hooks.registerTargets.tapPromise(HOOK_NAME, (lpb) => Promise.all(localPluginPaths.map(
			(pluginPath) => lpb.createTarget({
				name: `@aedris/build-tools:buildLocalPlugins:${pluginPath}`,
				context: [DefaultContext.NODE],
				entry: {
					[path.basename(pluginPath, '.ts')]: path.resolve(config.rootDir, pluginPath),
				},
				outputDir: path.dirname(pluginPath),
			}),
		)));

		log('Compiling local plugins');

		await localPluginBuilder.load();
		await localPluginBuilder.build();

		log('Finished compiling local plugins');
	}
}
