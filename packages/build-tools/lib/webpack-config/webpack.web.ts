import {WebpackConfigCreator} from '../Builder';
import {DefaultContext} from '..';

export default <WebpackConfigCreator> function createWebpackConfig(config, target) {
	const {builder} = target;

	// TODO: using Rule.rules for all this relies on fixes that are currently not released for both webpack-chain (see https://github.com/neutrinojs/webpack-chain/pull/220) and vue-loader (see https://github.com/vuejs/vue-loader/pull/1618), so make sure the package.json minimum versions get updated to versions in which the fixes are released
	// CSS support: uses a single rule for all style resources utilizing nested rules for better plugin compatibility
	const stylesRule = config.module.rule('styles');
	// Use `include` as webpack-chain doesn't support using `test` as a set and using both would require both `test` and `include` to pass. They're functionally the same anyway.
	stylesRule.include.add(/\.css$/);

	// Add the css and style loader as nested rules to allow easily changing the rules applied to CSS resources regardless of language processors (Stylus, etc) used
	const cssRule = stylesRule.rule('css');
	cssRule.use('css-loader').loader('css-loader');
	cssRule.use('style-loader').loader('style-loader').before('css-loader');

	function addStyleProcessor(name: string, test: RegExp, loader: string) {
		// Make the styles rule catch modules for our loader
		stylesRule.include.add(test);

		// Process the modules with the appropriate loader before using the normal CSS loaders
		const rule = stylesRule.rule(name).test(test).after('css');
		rule.use(loader).loader(loader);
	}

	addStyleProcessor('less', /\.less$/, 'less-loader');
	// TODO: sass doesn't resolve urls with webpack. see https://github.com/webpack-contrib/sass-loader#problems-with-url
	addStyleProcessor('sass', /\.s[ac]ss$/, 'sass-loader');
	addStyleProcessor('stylus', /\.styl(us)?$/, 'stylus-loader');

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
