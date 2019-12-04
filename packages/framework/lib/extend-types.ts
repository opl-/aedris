import {AedrisPluginOptions} from '@aedris/build-tools/dist/AedrisConfigHandler';

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
