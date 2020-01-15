import {AedrisPlugin, Builder, DefaultContext} from '@aedris/build-tools';
import path from 'path';

const HOOK_NAME = '@aedris/framework-vue';

export default <AedrisPlugin> {
	hookBuild(builder: Builder): void {
		builder.hooks.registerTargets.tapPromise(`${HOOK_NAME}:buildSelf`, (b) => Promise.all([
			b.createTarget({
				name: `${HOOK_NAME}:frontend-client`,
				context: [DefaultContext.WEB, DefaultContext.NODE],
				entry: {
					entryFrontendClient: path.resolve(b.config.rootDir, 'frontend/entryClient.ts'),
				},
				outputDir: './',
			}),
			b.createTarget({
				name: `${HOOK_NAME}:frontend-server`,
				context: [DefaultContext.WEB, DefaultContext.NODE],
				entry: {
					entryFrontendServer: path.resolve(b.config.rootDir, 'frontend/entryServer.ts'),
				},
				outputDir: './',
			}),
		]));
	},
};
