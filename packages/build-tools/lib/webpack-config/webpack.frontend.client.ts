import merge from 'webpack-merge';

import {WebpackConfigCreator} from '../BuildTarget';
import createBaseConfig from './webpack.frontend.base';

export default <WebpackConfigCreator> function createWebpackConfig(target) {
	const {builder} = target;

	// TODO: split vendor code into separate chunk

	return merge(createBaseConfig(target), {
		output: {
			// TODO: make sure that in development we don't accidentally use hashes as that could lead to memory leaks
			// Use hashes for the output file names to prevent cache blocking updates, but not in development as that could lead to memory leaks
			filename: builder.isDevelopment ? '[name].js' : '[name].[chunkhash:16].bundle.js',
		},
		performance: {
			// Emit warnings when the build size exceeds 250kB
			hints: builder.isDevelopment ? false : 'warning',
			maxEntrypointSize: 250000,
		},
	});
};
