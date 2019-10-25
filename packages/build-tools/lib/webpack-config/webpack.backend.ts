import {WebpackConfigCreator} from '../BuildTarget';
import createBaseConfig from './webpack.base';

export default <WebpackConfigCreator> function createWebpackConfig(target) {
	const config = createBaseConfig(target);

	// The backend will be ran in a node context
	config.target('node');
	config.output.libraryTarget('commonjs2');

	// Don't polyfill node things in a node context
	config.set('node', false);

	// TODO: possibly more config needed

	return config;
};
