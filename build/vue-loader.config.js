const autoPrefixer = require('autoprefixer');

module.exports = {
	extractCSS: process.env.NODE_ENV === 'production',
	preserveWhitespace: false,
	postcss: [
		autoPrefixer({
			browsers: ['last 3 versions', '>1%'],
		}),
	],
};
