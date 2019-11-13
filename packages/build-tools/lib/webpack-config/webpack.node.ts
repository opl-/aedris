import {WebpackConfigCreator} from '../Builder';

export default <WebpackConfigCreator> function createWebpackConfig(config) {
	// The backend will be ran in a node context
	config.target('node');
	config.output.libraryTarget('commonjs2');

	// Don't polyfill node things in a node context
	// Normally `node` would be set to `false`, but due to a bug webpack-chain doesn't currently allow that. See https://github.com/neutrinojs/webpack-chain/issues/209
	config.node.merge({
		process: false,
		global: false,
		__filename: false,
		__dirname: false,
		Buffer: false,
		setImmediate: false,
	});

	// TODO: possibly more config needed

	return config;
};
