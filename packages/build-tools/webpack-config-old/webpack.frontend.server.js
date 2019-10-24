const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin');
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const base = require('./webpack.frontend.base');
const aedrisBuildConfig = require('./aedrisBuildConfig');

module.exports = merge(base, {
	target: 'node',
	devtool: '#source-map',
	entry: [
		path.resolve(__dirname, '../client/init/entry-client.ts'),
	],
	output: {
		filename: 'server-bundle.js',
		libraryTarget: 'commonjs2',
	},
	// https://webpack.js.org/configuration/externals/#externals
	// https://github.com/liady/webpack-node-externals
	externals: nodeExternals({
		// do not externalize CSS files in case we need to import it from a dep
		whitelist: /\.css$/,
	}),
	plugins: [
		new webpack.DefinePlugin({
			'process.env.VUE_ENV': '"server"',
		}),
		new VueSSRServerPlugin(),
		new CopyWebpackPlugin([{
			from: path.resolve(aedrisBuildConfig.appRoot, 'client/static'),
			to: path.resolve(aedrisBuildConfig.distDir, 'res'),
		}, {
			from: path.resolve(aedrisBuildConfig.appRoot, 'client/index.template.html'),
			to: aedrisBuildConfig.distDir,
		}, {
			from: path.resolve(aedrisBuildConfig.appRoot, 'lib'),
			to: path.resolve(aedrisBuildConfig.distDir, 'lib'),
		}]),
	],
});
