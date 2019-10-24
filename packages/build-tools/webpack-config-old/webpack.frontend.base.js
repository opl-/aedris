const path = require('path');
const webpack = require('webpack');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const eslintFriendlyFormatter = require('eslint-friendly-formatter');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const vueConfig = require('./vue-loader.config');
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
	mode: isProd ? 'production' : 'development',
	devtool: isProd ? false : '#cheap-module-source-map',
	context: path.resolve(__dirname, '..'),
	output: {
		path: path.resolve(aedrisBuildConfig.distDir, 'res'),
		publicPath: '/_/res/',
		filename: '[name].[chunkhash].js',
	},
	resolve: {
		extensions: ['.js', '.ts', '.vue', '.json'],
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
	externals: {
		vue: {
			// Do not include vue in the chunks for browser - will be loaded from a CDN
			// TODO: test if this works in node
			commonjs: 'vue',
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
				path.resolve(aedrisBuildConfig.appRoot, 'client'),
				path.resolve(aedrisBuildConfig.appRoot, 'lib'),
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
		}, {
			test: /\.(js|ts)$/,
			loader: 'babel-loader',
			options: {
				// required to resolve plugins and presets correctly
				cwd: path.resolve(__dirname, '..'),
				presets: [
					['@babel/preset-env', {
						modules: false,
						targets: {
							browsers: [
								'last 2 versions',
								'> 1%',
							],
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
		}, {
			test: /\.(png|jpg|gif|svg)$/,
			loader: 'url-loader',
			options: {
				limit: 10000,
				name: '[name].[ext]?[hash:8]',
			},
		}, {
			test: /\.(ttf|otf|woff|woff2)$/,
			loader: 'url-loader',
			options: {
				limit: 10000,
				name: '[name].[ext]?[hash:4]',
			},
		}, {
			test: /\.css$/,
			use: isProd ? [
				MiniCssExtractPlugin.loader,
				'css-loader?minimize',
			] : [
				'vue-style-loader',
				'css-loader',
			],
		}],
	},
	plugins: [
		new VueLoaderPlugin(),
		new webpack.DefinePlugin({
			AEDRIS_APP_CONFIG: escapeDefineObject(aedrisBuildConfig.appConfig),
		}),
		...(isProd ? [
			new MiniCssExtractPlugin({
				filename: 'common.[chunkhash].css',
			}),
		] : [
			new FriendlyErrorsPlugin(),
		]),
	],
};
