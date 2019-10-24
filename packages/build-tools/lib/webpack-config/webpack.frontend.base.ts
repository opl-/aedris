import merge from 'webpack-merge';

import {WebpackConfigCreator} from '../BuildTarget';
import createBaseConfig from './webpack.base';

export default <WebpackConfigCreator> function createWebpackConfig(target) {
	const {builder} = target;

	return merge(createBaseConfig(target), {
		mode: builder.isDevelopment ? 'development' : 'production',
		module: {
			// Support different style processors out of the box
			rules: [{
				test: /\.less$/,
				loader: 'less-loader',
			}, {
				test: /\.s[ac]ss$/,
				loader: 'sass-loader',
			}, {
				test: /\.styl$/,
				loader: 'stylus-loader',
			}],
		},
	});
};
