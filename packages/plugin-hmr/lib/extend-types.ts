import {AedrisPluginOptions} from '@aedris/build-tools';

import {HMRPluginInstance} from './build';
import {HMRPluginOptions} from './HMRPluginOptions';

declare module '@aedris/build-tools' {
	interface AedrisPluginOptions {
		'@aedris/plugin-hmr': HMRPluginOptions;
	}

	interface Builder {
		getPluginOptions(plugin: '@aedris/plugin-hmr'): HMRPluginOptions;

		getPluginInstance(pluginName: '@aedris/plugin-hmr'): HMRPluginInstance;
	}

	interface BuildTarget {
		getPluginOptions(plugin: '@aedris/plugin-hmr'): HMRPluginOptions;
	}
}
