import {AedrisPlugin, BuildTarget, DefaultContext} from '@aedris/build-tools';

const HOOK_NAME = '@aedris/vue';

export default <AedrisPlugin> {
	async hookTarget(buildTarget: BuildTarget) {
		const {VueLoaderPlugin} = await import('vue-loader');
		const {default: VueSSRClientPlugin} = await import('vue-server-renderer/client-plugin');
		const {default: VueSSRServerPlugin} = await import('vue-server-renderer/server-plugin');

		buildTarget.hooks.prepareTarget.tap(HOOK_NAME, (t) => {
			t.registerContext('vue', (config, target) => {
				// Try matching the `.vue` extension
				config.resolve.extensions.add('.vue');

				// Use `vue-loader` for `.vue` files
				const vueRule = config.module.rule('vue').test(/\.vue$/);
				vueRule.use('vue-loader').loader('vue-loader');

				// Use the VueLoaderPlugin to enable using single file components
				// TODO: config
				config.plugin('vue-loader').use(VueLoaderPlugin);

				// Vue requires using their fork of style loader
				config.module.rule('styles').rule('css').use('style-loader').loader('vue-style-loader');

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

				return config;
			});
		});
	},
};
