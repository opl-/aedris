const path = require('path');
const webpack = require('webpack');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
// const eslintFriendlyFormatter = require('eslint-friendly-formatter');
const aedrisBuildConfig = require('./aedrisBuildConfig');

const isProd = process.env.NODE_ENV === 'production';

function escapeDefineObject(obj) {
	return Object.entries(obj).reduce((acc, [k, v]) => {
		if (Object.prototype.toString.call(v) === '[object Object]') acc[k] = escapeDefineObject(v);
		else acc[k] = JSON.stringify(v);

		return acc;
	}, {});
}

module.exports = {
	target: 'node',
	mode: isProd ? 'production' : 'development',
	// FIXME
	devtool: isProd ? false : '#cheap-module-source-map',
	context: path.resolve(__dirname, '..'),
	entry: './index.js',
	output: {
		path: aedrisBuildConfig.distDir,
		filename: '[name].[chunkhash].js',
	},
	resolve: {
		extensions: ['.js', '.ts', '.json'],
		alias: {
			// TODO; take this from the app directory itself
			// static: path.resolve(__dirname, '../static'),
			'aedris/app-config$': aedrisBuildConfig.appConfigPath,
			'aedris/user-app$': aedrisBuildConfig.appConfig.appComponentPath,
		},
		// Allow resolving modules from either Aedris lib or app.
		modules: [
			path.resolve(aedrisBuildConfig.appRoot, 'node_modules'),
			'node_modules',
		],
	},
	optimization: {
		// TODO: verify that this works together with the DefinePlugin in client and server
		nodeEnv: isProd ? 'production' : 'development',
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
				path.resolve(aedrisBuildConfig.appRoot, 'client'),
				path.resolve(aedrisBuildConfig.appRoot, 'lib'),
			],
			options: {
				formatter: eslintFriendlyFormatter,
			},
		}, { */
			test: /\.(js|ts)$/,
			loader: 'babel-loader',
			options: {
				// required to resolve plugins and presets correctly
				cwd: path.resolve(__dirname, '..'),
				presets: [
					['@babel/preset-env', {
						modules: false,
						targets: {
							node: 'current',
						},
					}],
					'@babel/preset-typescript',
				],
				plugins: [
					'@babel/plugin-transform-runtime',
					'@babel/plugin-syntax-dynamic-import',
				],
			},
			exclude: /node_modules/,
		}],
	},
	plugins: [
		new webpack.DefinePlugin({
			AEDRIS_APP_CONFIG: escapeDefineObject(aedrisBuildConfig.appConfig),
		}),
		...(isProd ? [] : [
			new FriendlyErrorsPlugin(),
		]),
	],
};
