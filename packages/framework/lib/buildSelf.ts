import {AedrisModule, Builder, DefaultContext} from '@aedris/build-tools';
import path from 'path';

export default <AedrisModule> {
	hookBuild(builder: Builder): void {
		builder.hooks.registerTargets.tapPromise('@aedris/framework/buildSelf', (b) => Promise.all([
			b.createTarget({
				context: DefaultContext.BACKEND,
				entry: {
					backend: path.resolve(__dirname, '../backend/index.ts'),
				},
				outputDir: './',
			}),
			b.createTarget({
				context: DefaultContext.FRONTEND_SERVER,
				entry: {
					entryFrontendClient: path.resolve(__dirname, '../frontend/entryClient.ts'),
				},
				outputDir: './',
			}),
			b.createTarget({
				context: DefaultContext.FRONTEND_SERVER,
				entry: {
					entryFrontendServer: path.resolve(__dirname, '../frontend/entryServer.ts'),
				},
				outputDir: './',
			}),
		]));
	},
};
