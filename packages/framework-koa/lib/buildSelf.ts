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
					// FIXME: the `entry` entry point should reference the `index` entry point to avoid code duplication and potential issues with types
					index: path.resolve(b.config.rootDir, 'backend/index.ts'),
					entry: path.resolve(b.config.rootDir, 'backend/entry.ts'),
				},
				outputDir: './',
			}),
		]));
	},
};
