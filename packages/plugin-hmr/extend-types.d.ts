import {AedrisPluginConfig} from '@aedris/build-tools/dist/AedrisConfigHandler';

import {HMRPluginInstance} from './lib/build';
import {HMRPluginOptions} from './lib/HMRPluginOptions';

declare module '@aedris/build-tools' {
	interface AedrisPluginConfig {
		options: {
			'@aedris/plugin-hmr': HMRPluginOptions;
		};
	}

	interface Builder {
		getPluginOptions(plugin: '@aedris/plugin-hmr'): HMRPluginOptions;

		getPluginInstance(pluginName: '@aedris/plugin-hmr'): HMRPluginInstance;
	}

	interface BuildTarget {
		getPluginOptions(plugin: '@aedris/plugin-hmr'): HMRPluginOptions;
	}
}
