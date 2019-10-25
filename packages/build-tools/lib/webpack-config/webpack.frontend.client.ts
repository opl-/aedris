import {WebpackConfigCreator} from '../BuildTarget';
import createBaseConfig from './webpack.frontend.base';

export default <WebpackConfigCreator> function createWebpackConfig(target) {
	const {builder} = target;

	const config = createBaseConfig(target);

	// TODO: split vendor code into separate chunk

	// TODO: make sure that in development we don't accidentally use hashes as that could lead to memory leaks
	// Use hashes for the output file names to prevent cache blocking updates, but not in development as that could lead to memory leaks
	config.output.filename(builder.isDevelopment ? '[name].js' : '[name].[chunkhash:16].bundle.js');

	// Emit warnings when the build size exceeds 250kB
	config.performance.hints(builder.isDevelopment ? false : 'warning');
	config.performance.maxEntrypointSize(250000);

	return config;
};
