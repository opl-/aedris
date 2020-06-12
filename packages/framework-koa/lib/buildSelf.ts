import {AedrisPlugin, Builder, DefaultContext} from '@aedris/build-tools';
import path from 'path';

const HOOK_NAME = '@aedris/framework-koa';

export default <AedrisPlugin> {
	hookBuild(builder: Builder): void {
		builder.hooks.registerTargets.tapPromise(`${HOOK_NAME}:buildSelf`, (b) => Promise.all([
			b.createTarget({
				name: `${HOOK_NAME}:backend`,
				context: [DefaultContext.NODE],
				entry: {
					index: path.resolve(b.config.rootDir, 'backend/index.ts'),
				},
				outputDir: './',
			}),
		]));
	},
};
