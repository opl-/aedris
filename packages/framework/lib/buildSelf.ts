import {AedrisPlugin, Builder, DefaultContext} from '@aedris/build-tools';
import path from 'path';

export default <AedrisPlugin> {
	hookBuild(builder: Builder): void {
		builder.hooks.registerTargets.tapPromise('@aedris/framework/buildSelf', (b) => Promise.all([
			b.createTarget({
				name: '@aedris/framework:backend',
				context: [DefaultContext.NODE],
				entry: {
					backend: path.resolve(b.config.rootDir, 'backend/index.ts'),
				},
				outputDir: './',
			}),
			b.createTarget({
				name: '@aedris/framework:frontend-client',
				context: [DefaultContext.WEB, DefaultContext.NODE],
				entry: {
					entryFrontendClient: path.resolve(b.config.rootDir, 'frontend/entryClient.ts'),
				},
				outputDir: './',
			}),
			b.createTarget({
				name: '@aedris/framework:frontend-server',
				context: [DefaultContext.WEB, DefaultContext.NODE],
				entry: {
					entryFrontendServer: path.resolve(b.config.rootDir, 'frontend/entryServer.ts'),
				},
				outputDir: './',
			}),
		]));
	},
};
