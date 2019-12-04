import {AedrisPluginOptions} from '@aedris/build-tools';

import {FrameworkOptions} from './FrameworkOptions';

declare module '@aedris/build-tools' {
	interface AedrisPluginOptions {
		'@aedris/framework': FrameworkOptions;
	}

	interface Builder {
		getPluginOptions(plugin: '@aedris/framework'): FrameworkOptions;
	}

	interface BuildTarget {
		getPluginOptions(plugin: '@aedris/framework'): FrameworkOptions;
	}
}
