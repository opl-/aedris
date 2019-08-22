const configFrontendClient = require('./webpack.frontend.client');
const configFrontendServer = require('./webpack.frontend.server');
const configBackend = require('./webpack.backend');

module.exports = [
	configFrontendClient,
	configFrontendServer,
	configBackend,
];
