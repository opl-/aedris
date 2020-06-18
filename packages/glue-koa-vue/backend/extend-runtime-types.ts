import '@aedris/build-tools/dist/runtime';

import {GlueKoaVuePlugin} from './GlueKoaVuePlugin';

declare module '@aedris/build-tools/dist/runtime' {
	interface RuntimePluginLoader {
		getPlugin(pluginName: '@aedris/glue-koa-vue'): GlueKoaVuePlugin;
	}
}
