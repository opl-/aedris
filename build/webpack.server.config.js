const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin');
const base = require('./webpack.base.config');

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
	plugins: [
		new webpack.DefinePlugin({
			// strip dev-only code in Vue source
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
			'process.env.VUE_ENV': '"server"',
		}),
		new VueSSRServerPlugin(),
		// TODO: set up copy plugin
	],
});
