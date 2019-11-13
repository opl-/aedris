import {AedrisPlugin, Builder, DefaultContext} from '@aedris/build-tools';
import path from 'path';

// TODO: https://vue-loader.vuejs.org/options.html has some interesting options like cacheDirectory

const HOOK_NAME = '@aedris/framework';

export default <AedrisPlugin> {
	hookBuild(builder: Builder): void {
		builder.usePlugin('@aedris/vue');

		builder.hooks.registerTargets.tapPromise(HOOK_NAME, (b) => {
			if (builder.config.isPlugin) {
				// Create targets for plugins using standardized entry point paths for plugins
				return Promise.all([
					b.createTarget({
						name: '@aedris/framework/plugin-backend-bundle',
						context: [DefaultContext.NODE],
						entry: {
							backend: path.resolve(b.config.backendDir, 'index.ts'),
						},
						outputDir: './backend/',
					}),
					b.createTarget({
						name: '@aedris/framework/plugin-frontend-bundle',
						context: [DefaultContext.WEB, DefaultContext.NODE],
						entry: {
							frontend: path.resolve(b.config.backendDir, 'index.ts'),
						},
						outputDir: './frontend/',
					}),
				]);
			}

			// Create targets for apps using our own entry points to allow skipping boilerplate code in projects
			// TODO: this is going to skip all the project files and we don't want to skip those >.< (use generated entry)
			return Promise.all([
				b.createTarget({
					name: '@aedris/framework:app-backend-bundle',
					context: [DefaultContext.NODE],
					entry: {
						backend: '@aedris/framework/dist/backend',
					},
					outputDir: './backend/',
				}),
				b.createTarget({
					name: '@aedris/framework:app-frontend-client-bundle',
					context: [DefaultContext.WEB],
					entry: {
						app: '@aedris/framework/dist/entryFrontendClient',
					},
					outputDir: './frontend-client/',
				}),
				b.createTarget({
					name: '@aedris/framework:app-frontend-server-bundle',
					context: [DefaultContext.WEB, DefaultContext.NODE],
					entry: {
						frontend: '@aedris/framework/dist/entryFrontendServer',
					},
					outputDir: './frontend-server/',
				}),
			]);
		});

		builder.hooks.registerDynamicModules.tap(HOOK_NAME, (b) => {
			// TODO: config
			b.setDynamicModule(`${HOOK_NAME}:router`, path.resolve(b.config.frontendDir, 'router/'));
		});
	},
};
