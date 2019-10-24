import {AsyncParallelHook} from 'tapable';

export interface RuntimeModule {
	hookApp?(loader: RuntimeModuleLoader): void;
}

export default class RuntimeModuleLoader {
	hooks = {
		init: new AsyncParallelHook(),
	};

	modules: Record<string, any> = {};
	dynamicModules: Record<string, any> = {};

	getModule(moduleName: string): any {
		return this.modules[moduleName];
	}

	registerModule(moduleName: string, moduleExport: any) {
		// TODO: resolve promises in exports?
		this.modules[moduleName] = moduleExport;
	}

	getDynamicModule(dynamicModuleName: string): any {
		return this.dynamicModules[dynamicModuleName];
	}

	registerDynamicModule(dynamicModuleName: string, moduleExport: any) {
		this.dynamicModules[dynamicModuleName] = moduleExport;
	}

	async start(initializingModuleName?: string, initializingModule?: any) {
		if (initializingModuleName) {
			// Enables modules that need to act as bundle entry points to expose themselves to other modules
			this.modules[initializingModuleName] = initializingModule;
		}

		Object.values(this.modules).forEach((module) => {
			// Call hookApp only if it exists
			if (module && typeof module.hookApp === 'function') module.hookApp(this);
		});

		await this.hooks.init.promise();
	}
}
