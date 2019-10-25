import {WebpackConfigCreator} from '../BuildTarget';
import createBaseConfig from './webpack.frontend.base';

export default <WebpackConfigCreator> function createWebpackConfig(target) {
	const config = createBaseConfig(target);

	// The server bundle will be ran in a node context
	// TODO: use config from webpack.backend instead?
	config.target('node');
	config.output.libraryTarget('commonjs2');

	return config;
};
