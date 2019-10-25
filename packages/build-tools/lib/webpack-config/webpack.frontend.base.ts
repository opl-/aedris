import {WebpackConfigCreator} from '../BuildTarget';
import createBaseConfig from './webpack.base';

export default <WebpackConfigCreator> function createWebpackConfig(target) {
	const config = createBaseConfig(target);

	// Support different style processors out of the box
	const lessRule = config.module.rule('less').test(/\.less$/);
	lessRule.use('less-loader').loader('less-loader');

	const sassRule = config.module.rule('sass').test(/\.s[ac]ss$/);
	sassRule.use('sass-loader').loader('sass-loader');

	const stylusRule = config.module.rule('stylus').test(/\.styl$/);
	stylusRule.use('stylus-loader').loader('stylus-loader');

	return config;
};
