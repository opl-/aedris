import {FrameworkVuexPlugin} from './FrameworkVuexPlugin';

declare module '@aedris/build-tools/dist/runtime' {
	interface RuntimePluginLoader {
		getPlugin(plugin: '@aedris/framework-vuex'): FrameworkVuexPlugin;
	}
}
