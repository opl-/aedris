// TODO: html plugin
// TODO: import-plugin webpack resolver
// TODO: use config (expose a function for the consumers to pass the aedris config? somehow automatically resolve the config location?)

module.exports = {
	extends: [
		'@aedris',
	],
	// Enable the browser environment
	env: {
		browser: true,
		node: true,
	},
	overrides: [{
		// TODO: config
		files: ['client/**/*'],
		settings: {
			'import/extensions': ['.ts', '.d.ts', '.js', '.vue'],
		},
	}],
	// TODO
};
