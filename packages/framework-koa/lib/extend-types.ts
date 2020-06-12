import {FrameworkKoaPlugin} from '../backend/FrameworkKoaPlugin';
import {FrameworkKoaOptions} from './FrameworkKoaOptions';

declare module '@aedris/build-tools' {
	interface AedrisPluginOptions {
		'@aedris/framework-koa': FrameworkKoaOptions;
	}

	interface Builder {
		getPluginOptions(plugin: '@aedris/framework-koa'): FrameworkKoaOptions;
	}

	interface BuildTarget {
		getPluginOptions(plugin: '@aedris/framework-koa'): FrameworkKoaOptions;
	}

	interface RuntimePluginLoader {
		getPlugin(plugin: '@aedris/framework-koa'): FrameworkKoaPlugin;
	}
}
