import merge from 'webpack-merge';

import {WebpackConfigCreator} from '../BuildTarget';
import createBaseConfig from './webpack.frontend.base';

export default <WebpackConfigCreator> function createWebpackConfig(target) {
	return merge(createBaseConfig(target), {
		// The server bundle will be ran in a node context
		target: 'node',
		output: {
			libraryTarget: 'commonjs2',
		},
	});
};
