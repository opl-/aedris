import {AedrisPlugin, DefaultContext} from '@aedris/build-tools';
import {VueLoaderPlugin} from 'vue-loader';
import VueSSRClientPlugin from 'vue-server-renderer/client-plugin';
import VueSSRServerPlugin from 'vue-server-renderer/server-plugin';

const HOOK_NAME = '@aedris/vue';

export default <AedrisPlugin> {
	hookBuild(builder) {
		builder.hooks.prepareWebpackConfig.tap(HOOK_NAME, (config, target) => {
			// Override the build-tools externals function to exclude our own entry bundles. Kinda hacky but gets the job done.
			const originalExternals = target.externals['node-externals'];
			if (originalExternals) {
				// eslint-disable-next-line no-param-reassign
				target.externals['node-externals'] = (context: string, request: string, callback: (err?: Error, result?: string) => void) => {
					if (/@aedris\/framework\/dist\/(?:backend|entryFrontend(?:Client|Server))/.test(request)) return callback(undefined, undefined);
					return (originalExternals as Function)(context, request, callback);
				};
			}

			if (target.context.includes(DefaultContext.WEB)) {
				// Try matching the `.vue` extension
				config.resolve.extensions.add('.vue');

				// Use `vue-loader` for `.vue` files
				const vueRule = config.module.rule('vue').test(/\.vue$/);
				vueRule.use('vue-loader').loader('vue-loader');

				// Use the VueLoaderPlugin to enable using single file components
				// TODO: config
				config.plugin('vue-loader').use(VueLoaderPlugin);

				if (!target.config.isPlugin) {
					// Use the SSR plugin to create a server bundle
					if (target.context.includes(DefaultContext.NODE)) config.plugin('vue-ssr').use(VueSSRServerPlugin);
					// Use the SSR plugin to create a client bundle
					else config.plugin('vue-ssr').use(VueSSRClientPlugin);
				}

				// Enable ts-loader option to make TypeScript work with Vue single file components
				config.module.rule('typescript').use('ts-loader').merge({
					options: {
						appendTsSuffixTo: [/\.vue$/],
					},
				});
			}

			return config;
		});
	},
};
