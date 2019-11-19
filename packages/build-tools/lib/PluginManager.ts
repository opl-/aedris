import debug from 'debug';

const log = debug('aedris:build-tools:PluginManager');

export interface PluginInfo<T> {
	absolutePath: string;
	plugin: T;
}

export interface LoadPluginOptions {
	resolvePaths?: string[];
}

export default abstract class PluginManager<T> {
	pluginQueue: string[] = [];
	registeredPlugins: {[pluginName: string]: PluginInfo<T>} = {};

	async loadPlugins(pluginRefs: string[], opts: LoadPluginOptions = {}): Promise<void> {
		log('Loading %i plugins', pluginRefs.length);

		// Load plugins requested in the config
		// eslint-disable-next-line no-restricted-syntax
		for (const pluginRef of pluginRefs) {
			// eslint-disable-next-line no-await-in-loop
			await this.loadPlugin(pluginRef, opts);
		}

		// Keep loading plugins until all dependencies are loaded
		while (this.pluginQueue.length > 0) {
			const pluginRef = this.pluginQueue.shift() as string;
			// eslint-disable-next-line no-await-in-loop
			await this.loadPlugin(pluginRef, opts);
		}
	}

	/**
	 * Adds the plugin to the list of plugins to be used by this Builder, ensuring it only gets applied once.
	 *
	 * Should only be called from the hookBuild function.
	 *
	 * @param pluginRef Name or path of plugin to load
	 */
	usePlugin(pluginRef: string): void {
		log('Adding plugin %j to load queue', pluginRef);

		this.pluginQueue.push(pluginRef);
	}

	/**
	 * Loads a plugin by name and applies it, ensuring that it doesn't get applied more than once.
	 *
	 * @param pluginRef Name or path relative to project root of the plugin
	 */
	async loadPlugin(pluginRef: string, {resolvePaths}: LoadPluginOptions = {}): Promise<void> {
		log('Applying plugin %j', pluginRef);

		const isLocalPluginRef = /^[./]/.test(pluginRef);

		const pluginPath = require.resolve(pluginRef, {
			paths: [
				// Try to resolve plugins from passed in paths
				...(resolvePaths || []),
				// And from the directories of all the plugins, as those can request plugins to be loaded too, but only if they use a package name
				...(isLocalPluginRef ? [] : Object.values(this.registeredPlugins).map((info) => info.absolutePath)),
			],
		});

		// Resolve local plugin paths to their absolute paths
		const pluginName = isLocalPluginRef ? pluginPath : pluginRef;

		// Don't load plugins twice
		if (this.registeredPlugins[pluginName]) return void log('  Already loaded (by name: %j)', pluginName);
		if (Object.values(this.registeredPlugins).some((info) => info.absolutePath === pluginPath)) return void log('  Already loaded (by path: %j)', pluginPath);

		log('  Loading from %j', pluginPath);

		const plugin: T = (await import(pluginPath)).default;

		await this.applyPlugin(pluginName, {
			absolutePath: pluginPath,
			plugin,
		});
	}

	/**
	 * Registers the plugin in the Builder and calls the hookBuild function if possible. This method bypasses all duplicate checks.
	 *
	 * @param pluginName Name of the plugin
	 * @param pluginInfo Object containing information about the plugin
	 */
	async applyPlugin(pluginName: string, pluginInfo: PluginInfo<T>) {
		this.registeredPlugins[pluginName] = pluginInfo;

		await this.doApplyPlugin(pluginInfo.plugin);
	}

	/**
	 * Called to apply the loaded plugin object.
	 *
	 * @param plugin Plugin to apply
	 */
	abstract async doApplyPlugin(plugin: T): Promise<void>;
}
