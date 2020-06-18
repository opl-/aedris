import FriendlyErrorsPlugin from 'friendly-errors-webpack-plugin';
import path from 'path';
import util from 'util';
import WebpackVirtualModules from 'webpack-virtual-modules';

import {WebpackConfigCreator, DefaultContext} from '../Builder';
import externalsGenerator from '../util/externals';

// TODO: use file-loader, style-loader, css-loader
// TODO: add aliases

export default <WebpackConfigCreator> function createWebpackConfig(config, target) {
	const {builder, config: aedrisConfig} = target;

	config.mode(builder.isDevelopment ? 'development' : 'production');

	// Each target must have an entry point - use it
	// TODO: use webpack-chain instead of BuildTarget for figuring out entry points?
	Object.entries(target.entry).forEach(([entryName, stuff]) => {
		config.entry(entryName).merge(stuff);
	});

	// Resolve paths from the project directory
	config.context(aedrisConfig.rootDir);

	// Specify where to output the files to prevent CWD mess.
	config.output.path(path.resolve(aedrisConfig.rootDir, aedrisConfig.outputDir, target.outputDir));
	// TODO: config
	config.output.publicPath('/_/res/');

	// Generate source maps appropriate to the environment
	// Eval source maps break dynamic module support - use with caution
	config.devtool(builder.isDevelopment ? 'inline-source-map' : target.context.includes(DefaultContext.WEB) ? 'hidden-source-map' : 'source-map');

	// Consider TypeScript files while resolving files
	config.resolve.extensions.merge(['.wasm', '.mjs', '.js', '.ts', '.json']);

	// Dynamic modules support
	Object.entries(target.dynamicAppModules).forEach(([dynamicModuleName, dynamicModulePath]) => {
		config.resolve.alias.set(`@aedris/dynamic/${dynamicModuleName}$`, dynamicModulePath);
	});

	// Allow resolving modules from:
	const modulePaths = [
		// The app itself
		'node_modules',
		// build-tools
		path.resolve(__dirname, '../../node_modules'),
		// build-tools, special case for development
		path.resolve(__dirname, '../../../../node_modules'),
		// Registered plugins
		// TODO: use find-up
		...Object.values(builder.registeredPlugins).map((v) => path.join(v.absolutePath, '../../node_modules')),
	];

	config.resolveLoader.modules.merge(modulePaths);
	config.resolve.modules.merge(modulePaths);

	// Replace any-promise with native Promise object. See https://github.com/kevinbeaty/any-promise/issues/28
	target.hooks.externalsQuery.tap('@aedris/build-tools:any-promise', (context) => {
		if (context.request === 'any-promise') return 'Promise';
		// eslint-disable-next-line consistent-return
		return undefined;
	});

	// Don't include node dependencies in a node context
	if (target.context.includes(DefaultContext.NODE)) {
		target.hooks.externalsQuery.tap({
			name: '@aedris/build-tools:node-externals',
			// As node externals are a very broad category, run them late
			stage: 10000,
		}, externalsGenerator({
			// With the exception of files that need to be processed by webpack
			whitelist: /^\.(css|less|s[ac]ss|styl)$/,
		}));
	}

	// Resolve dynamic modules only when building an app
	if (aedrisConfig.isPlugin) {
		// eslint-disable-next-line consistent-return
		target.hooks.externalsQuery.tap('@aedris/build-tools:dynamic-modules', (query) => (/^@aedris\/dynamic\/.+$/.test(query.request) ? `commonjs ${query.request}` : undefined));
	}

	// Externalize the runtime index in order to prevent the global RuntimePluginLoader instance from leaking into other app packages when multiple run in the same node context.
	// We should only externalize modules when running in a node context.
	if (!aedrisConfig.isPlugin && target.context.includes(DefaultContext.NODE)) {
		target.hooks.externalsQuery.tap({
			name: '@aedris/build-tools:bundleSpecificRuntimePluginLoader',
			// Run this hook early to reduce the chances of other hooks catching the module before us
			stage: -1000,
		}, (query) => {
			// Force all modules required from the runtime index to be externalized when they should.
			// Yes, the imports to externalize are listed here manually and need to be updated if any new imports are added. This shouldn't be an issue once externalsGenerator is fixed.
			if (query.request === './RuntimePluginLoader' && query.context.endsWith('build-tools/dist/runtime')) {
				return 'commonjs @aedris/build-tools/dist/runtime/RuntimePluginLoader';
			}

			if (/^@aedris\/build-tools\/dist\/runtime(?:\/index)?$/.test(query.request)) return false;

			// eslint-disable-next-line consistent-return
			return undefined;
		});
	}

	// Rules for TypeScript files
	const typescriptRule = config.module.rule('typescript').test(/\.ts$/);
	// Don't transpile TypeScript files from dependencies - those should already be built
	typescriptRule.exclude.add(/\/node_modules/).end();
	// Use `ts-loader`
	typescriptRule.use('ts-loader').loader('ts-loader').merge({
		options: {
			// Use webpack to figure out which files should be used
			onlyCompileBundledFiles: true,
			compilerOptions: {
				// Put the compilation results (including .d.ts files) from this build into the appropriate output directory
				outDir: config.output.get('path'),
			},
		},
	});

	// Use a nice output formatter
	// TODO: this plugin recommends using `quiet: true`
	config.plugin('error-logger').use(FriendlyErrorsPlugin, [<FriendlyErrorsPlugin.Options> {
		clearConsole: false,
		compilationSuccessInfo: {
			messages: [`Aedris build target ${JSON.stringify(target.name)} (context ${JSON.stringify(target.context)})`],
			notes: [],
		},
		additionalFormatters: [
			(errors) => (errors.length === 0 ? [] : [`Aedris build target ${JSON.stringify(target.name)} (context ${JSON.stringify(target.context)})`]),
		],
	}]);

	// Use the virtual modules plugin to allow creating entry points dynamically from configs. Virtual module creation is handled through the `BuildTarget` class.
	config.plugin('virtual-modules')
		.use(WebpackVirtualModules, [target.virtualModules])
		.init((Plugin, args) => {
			const plugin: WebpackVirtualModules = Plugin instanceof Function ? new (Plugin as any)(...args) : Plugin;

			// Add a custom inspect stringifier to make `--printWebpack` output less spammy
			(plugin as any)[util.inspect.custom] = function inspectVirtualModulesPlugin(depth: number, options: any) {
				return `${options.stylize('VirtualModulesPlugin', 'name')} ${util.inspect({
					// eslint-disable-next-line no-underscore-dangle
					virtualModules: (this as any)._compiler.inputFileSystem._virtualFiles,
				}, {...options, depth: options.depth && options.depth - 1})}`;
			};

			return plugin;
		});

	return config;
};
