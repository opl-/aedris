// Type extensions
import './extend-types';

import {AedrisPlugin, Builder} from '@aedris/build-tools';
import {HotModuleReplacementPlugin} from 'webpack';

import {HMRPluginOptions} from './HMRPluginOptions';
import {TargetRunner} from './TargetRunner';

const HOOK_NAME = '@aedris/plugin-hmr';

export interface HMRPluginInstance {
	targetRunners: {[entryPointName: string]: TargetRunner};
}

export default <AedrisPlugin> {
	normalizeOptions(options?: HMRPluginOptions): HMRPluginOptions {
		if (options === false) return options;

		const opts = (options || {}) as Exclude<HMRPluginOptions, false>;

		if (!opts.entryPoint) opts.entryPoint = {};

		/* eslint-disable no-param-reassign */
		Object.values(opts.entryPoint).forEach((entryPoint) => {
			if (!entryPoint) return;

			if (entryPoint.printOutput === undefined) entryPoint.printOutput = true;
		});
		/* eslint-enable */

		return opts;
	},
	hookBuild(builder: Builder) {
		const instance: HMRPluginInstance = {
			targetRunners: {},
		};

		builder.hooks.prepareWebpackConfig.tap(HOOK_NAME, (config, target) => {
			// HMR should never be used outside of development
			if (!target.builder.isDevelopment) return config;

			const options = target.getPluginOptions(HOOK_NAME);
			if (!options) return config;

			let foundEntryPoints = false;

			Object.entries(config.entryPoints.entries()).forEach(([name, entry]) => {
				const entryOptions = options.entryPoint[name];
				if (!entryOptions) return;

				foundEntryPoints = true;

				// Add the HMR client to all hmrClient bundles
				if (entryOptions.hmrClient) entry.prepend('webpack-hot-middleware/client');
			});

			if (options.hmrPlugin === true || (foundEntryPoints && options.hmrPlugin !== false)) {
				// HMR plugin is enabled, add the plugin
				config.plugin('hmr-plugin').use(HotModuleReplacementPlugin);
			}

			return config;
		});

		builder.hooks.afterLoad.tap(HOOK_NAME, (b) => {
			b.targets.forEach((target) => {
				const options = target.getPluginOptions<HMRPluginOptions>(HOOK_NAME);
				if (!options) return;

				const runner = new TargetRunner(target);
				runner.createHooks();
				instance.targetRunners[target.name] = runner;
			});
		});

		return instance;
	},
};
