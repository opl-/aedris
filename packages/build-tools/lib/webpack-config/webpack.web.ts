import {WebpackConfigCreator} from '../BuildTarget';
import {DefaultContext} from '..';

export default <WebpackConfigCreator> function createWebpackConfig(config, target) {
	const {builder} = target;

	// Support different style processors out of the box
	const lessRule = config.module.rule('less').test(/\.less$/);
	lessRule.use('less-loader').loader('less-loader');

	const sassRule = config.module.rule('sass').test(/\.s[ac]ss$/);
	sassRule.use('sass-loader').loader('sass-loader');

	const stylusRule = config.module.rule('stylus').test(/\.styl$/);
	stylusRule.use('stylus-loader').loader('stylus-loader');

	// There's no need to employ cache breakers and size warnings for SSR bundles.
	if (!target.context.includes(DefaultContext.NODE)) {
		// TODO: make sure that in development we don't accidentally use hashes as that could lead to memory leaks
		// Use hashes for the output file names to prevent cache blocking updates, but not in development as that could lead to memory leaks
		config.output.filename(builder.isDevelopment ? '[name].js' : '[name].[chunkhash:16].bundle.js');

		// Emit warnings when the build size exceeds 250kB
		config.performance.hints(builder.isDevelopment ? false : 'warning');
		config.performance.maxEntrypointSize(250000);
	}

	return config;
};
