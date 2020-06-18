import {FrameworkKoaPlugin} from './FrameworkKoaPlugin';

declare module '@aedris/build-tools/dist/runtime' {
	interface RuntimePluginLoader {
		getPlugin(plugin: '@aedris/framework-koa'): FrameworkKoaPlugin;
	}
}
