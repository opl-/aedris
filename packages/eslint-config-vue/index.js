const parentConfig = require('@aedris/eslint-config');

// TODO: import-plugin webpack resolver
// TODO: use config (expose a function for the consumers to pass the aedris config? somehow automatically resolve the config location?)

module.exports = {
	extends: [
		'@aedris',
	],
	overrides: [{
		// Apply Vue related rules only to the frontend directory, as components shouldn't appear anywhere else
		// TODO: config
		files: ['frontend/**/*'],
		extends: [
			// Use the Vue plugin and its recommended settings
			'plugin:vue/recommended',
		],
		parserOptions: {
			// For the code itself, use the parser from the parent config
			parser: parentConfig.parser,
			// As per @typescript-eslint/parser documentation, `.vue` files need to be added to the config
			extraFileExtensions: ['.vue'],
		},
		settings: {
			'import/extensions': ['.ts', '.d.ts', '.js', '.vue'],
		},
		rules: {
			// Hyphenating property names makes searching for them more difficult. Combined with weak tooling, it just doesn't make sense to force it.
			'vue/attribute-hyphenation': ['warn', 'never'],

			// Use tabs for indentation, as everywhere else
			'vue/html-indent': ['error', 'tab'],
		},
	}],
	// TODO
};
