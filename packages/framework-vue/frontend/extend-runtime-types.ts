import {FrameworkApp} from './createApp';

declare module '@aedris/build-tools/dist/runtime' {
	interface RuntimePluginLoader {
		getPlugin(pluginName: '@aedris/framework-vue'): FrameworkApp;
	}
}
