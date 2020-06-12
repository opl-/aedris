import RuntimePluginLoader, {RuntimePlugin} from '@aedris/build-tools/dist/runtime/RuntimePluginLoader';
import {AsyncParallelHook} from 'tapable';

import Backend from './Backend';

export class FrameworkKoaPlugin implements RuntimePlugin {
	hooks = {
		registerRoutes: new AsyncParallelHook(),
		afterLoad: new AsyncParallelHook(),
	};

	app = new Backend();

	hookApp(loader: RuntimePluginLoader) {
		loader.hooks.init.tapPromise('@aedris/framework-koa', async () => {
			await this.hooks.registerRoutes.promise();

			await this.hooks.afterLoad.promise();
		});
	}
}
