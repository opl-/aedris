import {AedrisPluginConfig} from '@aedris/build-tools/dist/AedrisConfigHandler';

import {FrameworkOptions} from './lib/FrameworkOptions';

declare module '@aedris/build-tools' {
	interface AedrisPluginConfig {
		options: {
			'@aedris/framework': FrameworkOptions;
		};
	}

	interface Builder {
		getPluginOptions(plugin: '@aedris/framework'): FrameworkOptions;
	}

	interface BuildTarget {
		getPluginOptions(plugin: '@aedris/framework'): FrameworkOptions;
	}
}
