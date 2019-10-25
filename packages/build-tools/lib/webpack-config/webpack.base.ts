import FriendlyErrorsPlugin from 'friendly-errors-webpack-plugin';
import path from 'path';
import util from 'util';
import ChainConfig from 'webpack-chain';
import WebpackVirtualModules from 'webpack-virtual-modules';

import {WebpackConfigCreator, DefaultContext} from '../BuildTarget';
import externalsGenerator from '../util/externals';

// TODO: clean output directories
// TODO: use file-loader, style-loader, css-loader
// TODO: add aliases

export default <WebpackConfigCreator> function createWebpackConfig(target) {
	const {builder} = target;
	const {config: aedrisConfig} = builder;

	const config = new ChainConfig();

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
	config.devtool(builder.isDevelopment ? 'eval-source-map' : target.context === DefaultContext.FRONTEND_SERVER ? 'source-map' : 'hidden-source-map');

	// Consider TypeScript files while resolving files
	config.resolve.extensions.merge(['.wasm', '.mjs', '.js', '.ts', '.json']);

	// Dynamic modules support
	Object.entries(builder.dynamicAppModules).forEach(([dynamicModuleName, dynamicModulePath]) => {
		config.resolve.alias.set(`@aedris/dynamic/${dynamicModuleName}$`, dynamicModulePath);
	});

	// Allow resolving modules from:
	config.resolveLoader.modules.merge([
		// The app itself
		'node_modules',
		// build-tools
		path.resolve(__dirname, '../../node_modules'),
		// build-tools, special case for development
		path.resolve(__dirname, '../../../../node_modules'),
		// Registered plugins
		// TODO: use find-up
		...Object.values(builder.registeredPlugins).map((v) => path.join(v.absolutePath, '../../node_modules')),
	]);

	// Replace any-promise with native Promise object. See https://github.com/kevinbeaty/any-promise/issues/28
	((config as any).getOrCompute('externals', () => []) as any[]).push({'any-promise': 'Promise'});

	// Don't include node dependencies in a node context
	if (target.context !== DefaultContext.FRONTEND_CLIENT) {
		((config as any).getOrCompute('externals', () => []) as any[]).push(externalsGenerator({
			// With the exception of files that need to be processed by webpack
			whitelist: /^@aedris\/entry(?:\/.+)?$|\.(css|s[ac]ss|styl)$/,
		}));
	}

	// Rules for TypeScript files
	const typescriptRule = config.module.rule('typescript').test(/\.ts$/);
	// Don't transpile TypeScript files from dependencies - those should already be built
	typescriptRule.exclude.add(/\/node_modules/).end();
	// Use `ts-loader`
	typescriptRule.use('ts-loader').loader('ts-loader');

	// Use a nice output formatter
	// TODO: this plugin recommends using `quiet: true`
	config.plugin('error-logger').use(FriendlyErrorsPlugin, [<FriendlyErrorsPlugin.Options> {
		clearConsole: false,
		compilationSuccessInfo: {
			messages: [`Aedris build target context: ${target.context}`],
			notes: [],
		},
		additionalFormatters: [
			(errors) => (errors.length === 0 ? [] : [`Aedris build target context: ${target.context}`]),
		],
	}]);

	// Use the virtual modules plugin to allow creating entry points dynamically from configs. Virtual module creation is handled through the `BuildTarget` class.
	config.plugin('virtual-modules')
		.use(WebpackVirtualModules, [target.virtualModules])
		.init((Plugin, args) => {
			const plugin = new Plugin(...args);

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
