const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');
const base = require('./webpack.frontend.base');

const isProd = process.env.NODE_ENV === 'production';

module.exports = merge(base, {
	entry: {
		app: [
			path.resolve(__dirname, '../client/init/entry-client.ts'),
		],
	},
	performance: {
		maxEntrypointSize: 300000,
		hints: isProd ? 'warning' : false,
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.VUE_ENV': '"client"',
		}),
		// extract vendor chunks for better caching
		/* new webpack.optimize.CommonsChunkPlugin({
			name: 'vendor',
			minChunks(mod) {
				// a module is extracted into the vendor chunk if...
				return (
					// it's inside node_modules
					/node_modules/.test(mod.context)
					// and not a CSS file (due to extract-text-webpack-plugin limitation)
					&& !/\.css$/.test(mod.request)
				);
			},
		}), */
		// extract webpack runtime & manifest to avoid vendor chunk hash changing
		// on every build.
		/* https://webpack.js.org/plugins/split-chunks-plugin/
		new webpack.optimize.CommonsChunkPlugin({
			name: 'manifest',
		}), */
		new VueSSRClientPlugin(),
	],
});
