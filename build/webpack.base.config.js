const path = require('path');
const webpack = require('webpack');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const eslintFriendlyFormatter = require('eslint-friendly-formatter');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const vueConfig = require('./vue-loader.config');

const isProd = process.env.NODE_ENV === 'production';

const {AEDRIS_APP_CONFIG} = process.env;

if (typeof AEDRIS_APP_CONFIG !== 'string' || !path.isAbsolute(AEDRIS_APP_CONFIG)) {
	throw new Error(`AEDRIS_APP_CONFIG must be an absolute path (current: ${JSON.stringify(AEDRIS_APP_CONFIG)})`);
}

// eslint-disable-next-line import/no-dynamic-require
const appConfig = require(AEDRIS_APP_CONFIG);

const distDir = path.resolve(appConfig.appRoot, 'dist');

module.exports = {
	mode: isProd ? 'production' : 'development',
	devtool: isProd ? false : '#cheap-module-source-map',
	context: path.resolve(__dirname, '..'),
	output: {
		path: path.resolve(distDir, 'res'),
		publicPath: '/_/res/',
		filename: '[name].[chunkhash].js',
	},
	resolve: {
		extensions: ['.js', '.ts', '.vue', '.json'],
		alias: {
			// TODO; take this from the app directory itself
			// static: path.resolve(__dirname, '../static'),
			'aedris-user-app$': appConfig.appComponentPath,
		},
	},
	module: {
		rules: [{
			/* TODO: add the model manifest? (rewrite it for ts types?)
			test: /\bmodelManifest\.js$/,
			loader: './build/modelManifestLoader',
		}, {
			test: /\.(ts|js|vue)$/,
			loader: 'eslint-loader',
			enforce: 'pre',
			include: [
				path.resolve(appConfig.appRoot, 'client'),
				path.resolve(appConfig.appRoot, 'lib'),
			],
			options: {
				formatter: eslintFriendlyFormatter,
			},
		}, { */
			test: /\.vue$/,
			use: [
				{
					loader: 'vue-loader',
					options: vueConfig,
				},
				'markup-inline-loader?strict=[inline]',
			],
		}],
	},
	plugins: [
		new VueLoaderPlugin(),
		...(isProd ? [
			new webpack.optimize.UglifyJsPlugin({
				compress: {
					warnings: false,
				},
			}),
			new MiniCssExtractPlugin({
				filename: 'common.[chunkhash].css',
			}),
		] : [
			new FriendlyErrorsPlugin(),
		]),
	],
};
