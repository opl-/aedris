import FriendlyErrorsPlugin from 'friendly-errors-webpack-plugin';
import path from 'path';

/* import {BannerPlugin} from 'webpack'; */
import {WebpackConfigCreator, DefaultContext} from '../BuildTarget';
import externalsGenerator from '../util/externals';

// TODO: clean output directories
// TODO: use file-loader, style-loader, css-loader
// TODO: add aliases

export default <WebpackConfigCreator> function createWebpackConfig(target) {
	const {builder} = target;
	const {config} = builder;

	return {
		mode: builder.isDevelopment ? 'development' : 'production',
		// Each target must have an entry point - use it
		entry: target.entry,
		// Resolve paths from the project directory
		context: config.rootDir,
		output: {
			// Specify where to output the files to prevent CWD mess.
			path: path.resolve(config.rootDir, config.outputDir, target.outputDir),
			// TODO: config
			publicPath: '/_/res/',
		},
		// Generate source maps appropriate to the environment
		devtool: builder.isDevelopment ? 'eval-source-map' : target.context === DefaultContext.FRONTEND_SERVER ? 'source-map' : 'hidden-source-map',
		resolve: {
			// Consider TypeScript files while resolving files
			extensions: ['.wasm', '.mjs', '.js', '.ts', '.json'],
		},
		resolveLoader: {
			// Allow resolving modules from:
			modules: [
				// The app itself
				'node_modules',
				// build-tools
				path.resolve(__dirname, '../../node_modules'),
				// build-tools, special case for development
				path.resolve(__dirname, '../../../../node_modules'),
				// Registered plugins
				// TODO: use find-up
				...Object.values(builder.registeredPlugins).map((v) => path.join(v.absolutePath, '../../node_modules')),
			],
		},
		externals: [
			{
				// Replace any-promise with native Promise object. See https://github.com/kevinbeaty/any-promise/issues/28
				'any-promise': 'Promise',
			},
			// Don't include node dependencies in a node context
			...(target.context !== DefaultContext.FRONTEND_CLIENT ? [
				externalsGenerator({
					// With the exception of files that need to be processed by webpack
					whitelist: /^@aedris\/entry(?:\/.+)?$|\.(css|s[ac]ss|styl)$/,
				}),
			] : []),
		],
		module: {
			rules: [{
				test: /\.ts$/,
				// Don't transpile TypeScript files from dependencies - those should already be built
				exclude: /\/node_modules/,
				loader: 'ts-loader',
			}],
		},
		plugins: [
			// Use a nice output formatter
			// TODO: this plugin recommends using `quiet: true`
			new FriendlyErrorsPlugin({
				clearConsole: false,
			}),
			// Insert the virtual modules plugin to allow creating entry points dynamically from configs
			target.virtualModules,
			// TODO: i feel like it shouldn't be added for client or maybe even frontend bundles...
			// TODO: it certainly won't work in a browser
			// TODO: seems like using an array for an entry point should work, but might fail when chunk splitting
			// Include source-map-support in all bundles
			/* new BannerPlugin({
				banner: 'require("source-map-support").install();',
				raw: true,
				entryOnly: false,
			}), */
		],
	};
};
