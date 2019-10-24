import {AsyncParallelHook} from 'tapable';

export interface RuntimePlugin {
	hookApp?(loader: RuntimeModuleLoader): void;
}

export default class RuntimeModuleLoader {
	hooks = {
		init: new AsyncParallelHook(),
	};

	plugins: Record<string, any> = {};
	dynamicModules: Record<string, any> = {};

	getPlugin(pluginName: string): any {
		return this.plugins[pluginName];
	}

	registerPlugin(pluginName: string, pluginExport: any) {
		// TODO: resolve promises in exports?
		this.plugins[pluginName] = pluginExport;
	}

	getDynamicModule(dynamicModuleName: string): any {
		return this.dynamicModules[dynamicModuleName];
	}

	registerDynamicModule(dynamicModuleName: string, moduleExport: any) {
		this.dynamicModules[dynamicModuleName] = moduleExport;
	}

	async start(initializingPluginName?: string, initializingPlugin?: any) {
		if (initializingPluginName) {
			// Enables plugins that need to act as bundle entry points to expose themselves to other plugins
			this.plugins[initializingPluginName] = initializingPlugin;
		}

		Object.values(this.plugins).forEach((plugin) => {
			// Call hookApp only if it exists
			if (plugin && typeof plugin.hookApp === 'function') plugin.hookApp(this);
		});

		await this.hooks.init.promise();
	}
}
