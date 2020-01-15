import {AedrisPluginOptions} from '@aedris/build-tools';

import {FrameworkVueOptions} from './FrameworkVueOptions';

declare module '@aedris/build-tools' {
	interface AedrisPluginOptions {
		'@aedris/framework-vue': FrameworkVueOptions;
	}

	interface Builder {
		getPluginOptions(plugin: '@aedris/framework-vue'): FrameworkVueOptions;
	}

	interface BuildTarget {
		getPluginOptions(plugin: '@aedris/framework-vue'): FrameworkVueOptions;
	}
}
