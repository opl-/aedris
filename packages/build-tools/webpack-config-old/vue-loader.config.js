const autoPrefixer = require('autoprefixer');
const aedrisBuildConfig = require('./aedrisBuildConfig');

// eslint-disable-next-line import/no-dynamic-require
const vueTemplateCompiler = require(require.resolve('vue-template-compiler', {
	paths: [aedrisBuildConfig.appRoot],
}));

module.exports = {
	extractCSS: process.env.NODE_ENV === 'production',
	preserveWhitespace: false,
	postcss: [
		autoPrefixer({
			browsers: ['last 3 versions', '>1%'],
		}),
	],
	// Supply the template compiler manually since Vue Loader tries to resolve it relative to Aedris lib.
	compiler: vueTemplateCompiler,
};
