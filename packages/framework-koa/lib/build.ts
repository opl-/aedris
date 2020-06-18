// Type extensions
import './extend-build-types';

import {
	AedrisConfigHandler,
	AedrisPlugin,
	Builder,
	DefaultContext,
} from '@aedris/build-tools';
import {HMRPluginOptions} from '@aedris/plugin-hmr';
import {constants as fsConstants, promises as fs} from 'fs';
import path from 'path';

import {FrameworkKoaOptions} from './FrameworkKoaOptions';

const HOOK_NAME = '@aedris/framework-koa';

const TARGET_NAME = {
	plugin: {
		backend: '@aedris/framework-koa:plugin-backend',
	},
	app: {
		backend: '@aedris/framework-koa:app-backend',
	},
} as const;

export {
	TARGET_NAME,
};

async function isFileReadable(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath, fsConstants.R_OK);

		return true;
	} catch (ex) {
		return false;
	}
}

function addHMRSupport(builder: Builder) {
	builder.usePlugin('@aedris/plugin-hmr');

	// Override plugin-hmr settings to run the backend and include HMR client in the frontend bundle
	builder.hooks.normalizeConfig.tap(HOOK_NAME, (config) => {
		if (builder.config.isPlugin || !builder.isDevelopment) return config;

		const options: Partial<Exclude<HMRPluginOptions, false>> = config.options['@aedris/plugin-hmr'] || {};

		options.entryPoint = options.entryPoint || {};

		// TODO: use overrides
		options.entryPoint.backend = {
			run: true,
			args: [
				// TODO: use config
				'dist/backend/backend.js',
			],
		};

		// eslint-disable-next-line no-param-reassign
		config.options['@aedris/plugin-hmr'] = options as HMRPluginOptions;

		return config;
	});
}

export default <AedrisPlugin> {
	normalizeOptions(options: undefined | FrameworkKoaOptions, config): FrameworkKoaOptions {
		const opts = (options || {}) as FrameworkKoaOptions;

		opts.backendDir = AedrisConfigHandler.resolvePath(config.rootDir, opts.backendDir || './backend', `options['${HOOK_NAME}'].backendDir`);

		return opts;
	},
	hookBuild(builder: Builder): void {
		addHMRSupport(builder);

		builder.hooks.registerTargets.tapPromise(HOOK_NAME, async (b) => {
			const options = b.getPluginOptions(HOOK_NAME);
			const userEntryPath = path.resolve(options.backendDir, 'index.ts');

			if (builder.config.isPlugin) {
				// Create targets for plugins using standardized entry point paths for plugins
				await b.createTarget({
					name: TARGET_NAME.plugin.backend,
					context: [DefaultContext.NODE],
					entry: {
						index: userEntryPath,
					},
					outputDir: './backend/',
				});

				return;
			}

			// Create targets for apps
			const useBoilerplateEntry = !await isFileReadable(userEntryPath);

			const target = await b.createTarget({
				name: TARGET_NAME.app.backend,
				context: [DefaultContext.NODE],
				entry: {
					// Use the boilerplate entry point if the user hasn't created an index file in their backend directory
					backend: useBoilerplateEntry ? '@aedris/framework-koa/dist/entry' : userEntryPath,
				},
				outputDir: './backend/',
			});

			// When using the boilerplate entry, the plugin registers itself when calling `RuntimePluginLoader.start`. Otherwise, we need to register the runtime plugin manually
			if (!useBoilerplateEntry) target.registerRuntimePlugin('@aedris/framework-koa', '@aedris/framework-koa/dist/index');
		});

		builder.hooks.registerDynamicModules.tap(HOOK_NAME, (target) => {
			const options = target.getPluginOptions(HOOK_NAME);

			// TODO: config?
			target.setDynamicModule(`${HOOK_NAME}:routes`, path.resolve(options.backendDir, 'route/index.ts'));
		});

		builder.hooks.prepareWebpackConfig.tap(HOOK_NAME, (config, target) => {
			// Never externalize our own entry bundles when building the app for dynamic module resolution used in those bundles to work
			target.hooks.externalsQuery.tap(HOOK_NAME, (query) => {
				if (query.request === '@aedris/framework-koa/dist/entry') return false;
				// eslint-disable-next-line consistent-return
				return undefined;
			});

			return config;
		});
	},
};
