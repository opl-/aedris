import {AedrisPluginConfig} from '@aedris/build-tools/dist/AedrisConfigHandler';

import {HMRPluginOptions} from './lib/HMRPluginOptions';

declare module '@aedris/build-tools' {
	interface AedrisPluginConfig {
		options: {
			'@aedris/plugin-hmr': HMRPluginOptions;
		};
	}

	interface Builder {
		getPluginOptions(plugin: '@aedris/plugin-hmr'): HMRPluginOptions;
	}

	interface BuildTarget {
		getPluginOptions(plugin: '@aedris/plugin-hmr'): HMRPluginOptions;
	}
}
