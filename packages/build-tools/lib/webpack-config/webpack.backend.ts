import merge from 'webpack-merge';

import {WebpackConfigCreator} from '../BuildTarget';
import createBaseConfig from './webpack.base';

export default <WebpackConfigCreator> function createWebpackConfig(target) {
	const {config} = target.builder;

	return merge(createBaseConfig(target), {
		// Use the rootDir as webpack context
		context: config.rootDir,
		// The backend will be ran in a node context
		target: 'node',
		output: {
			libraryTarget: 'commonjs2',
		},
		// Don't polyfill node things in a node context
		node: false,
		// TODO
	});
};
