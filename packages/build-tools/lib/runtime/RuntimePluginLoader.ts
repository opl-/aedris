import {AsyncParallelHook} from 'tapable';

export interface RuntimePlugin {
	/**
	 * Called at runtime after all plugins were loaded and before the app is initialized.
	 *
	 * Plugins should use the provided loader to hook into other plugins and the loader itself before the app is initialized.
	 *
	 * @param loader The loader instance for this app
	 * @param options Runtime options defined by the build script when registering the plugin
	 */
	hookApp?(loader: RuntimePluginLoader, options: any): void;
}

export interface RegisteredRuntimePlugin {
	exports: any;

	options: any;
}

export default class RuntimePluginLoader {
	hooks = {
		init: new AsyncParallelHook(),
	};

	/** The runtime plugin instances. */
	plugins: Record<string, RuntimePlugin> = {};

	/** List of all the plugins that were registered so far. This includes plugins that haven't yet been initialized. */
	registeredPlugins: Record<string, RegisteredRuntimePlugin> = {};

	getPlugin(pluginName: string): any {
		return this.plugins[pluginName];
	}

	registerPlugin(pluginName: string, pluginExports: any, options: any) {
		if (this.registeredPlugins[pluginName]) throw new Error(`Runtime plugin ${JSON.stringify(pluginName)} is already registered!`);

		this.registeredPlugins[pluginName] = {
			exports: pluginExports,
			options,
		};
	}

	async start(initializingPluginName?: string, initializingPluginInstance?: RuntimePlugin) {
		if (initializingPluginName && typeof initializingPluginInstance !== 'undefined') {
			// Enables plugins that need to act as bundle entry points to expose themselves to other plugins
			this.plugins[initializingPluginName] = initializingPluginInstance;
			this.registeredPlugins[initializingPluginName] = {
				exports: undefined,
				options: undefined,
			};
		}

		// Create the plugin instances
		await Promise.all(Object.entries(this.registeredPlugins).map(async ([name, info]) => {
			// Resolve any promises that might have been passed when registering the plugin
			// eslint-disable-next-line no-param-reassign
			info.exports = await info.exports;

			if (typeof info.exports?.createAedrisPlugin === 'function') {
				const pluginInstance: RuntimePlugin = info.exports.createAedrisPlugin();

				this.plugins[name] = pluginInstance;
			} else if (name !== initializingPluginName) {
				throw new Error('Registered runtime plugin has no createAedrisPlugin function');
			}
		}));

		Object.entries(this.plugins).forEach(([pluginName, plugin]) => {
			// Call hookApp only if it exists
			if (plugin && typeof plugin.hookApp === 'function') plugin.hookApp(this, this.registeredPlugins[pluginName].options);
		});

		await this.hooks.init.promise();
	}
}
