const isProd = process.env.NODE_ENV === 'production';

module.exports = {
	extends: ['airbnb-base'],
	parserOptions: {
		sourceType: 'module',
	},
	env: {
		browser: true,
		node: true,
	},
	// Custom rules because airbnb is not perfect.
	rules: {
		// Don't require extensions when importing .ts files.
		'import/extensions': ['error', 'always', {
			js: 'never',
			ts: 'never',
		}],

		// Aedris uses webpack aliases mixed with externals to allow dependencies to use modules from the app.
		'import/no-unresolved': ['error', {
			commonjs: true,
			caseSensitive: true,
			ignore: ['^@aedris/dynamic/.'],
		}],

		// Spaces in anonymous functions are a no.
		'space-before-function-paren': ['error', {
			anonymous: 'never',
			named: 'never',
			asyncArrow: 'always',
		}],

		// var++ syntax is just fine. Why disable it?
		'no-plusplus': 'off',

		// Nested ternaries can often be more readable than a chain of ifs.
		'no-nested-ternary': 'off',

		// Tabs allow different users to use different indentation levels without changing the files.
		indent: ['error', 'tab'],
		'no-tabs': ['error', {
			allowIndentationTabs: true,
		}],

		// Spaces in curly braces "inflate" the code in a weird way. Personal preference, I guess.
		'object-curly-spacing': ['error', 'never'],

		// Console output can be useful in development.
		'no-console': isProd ? 'error' : 'off',

		// Debugger statements can be useful in development.
		'no-debugger': isProd ? 'error' : 'off',

		// Interrupting code flow with a `return void func()` statement can lead to easier to read code.
		'consistent-return': ['error', {
			treatUndefinedAsUnspecified: true,
		}],
		'no-void': 'off',

		// Sometimes it's better to rely on the editor's code wrapping functionality.
		'max-len': ['error', 200, 4, {
			ignoreUrls: true,
			ignoreComments: true,
			ignoreRegExpLiterals: true,
			ignoreStrings: true,
			ignoreTemplateLiterals: true,
		}],

		// Allowing no empty lines is useful for props.
		'lines-between-class-members': ['error', 'always', {
			exceptAfterSingleLine: true,
		}],

		// This is a stupid rule that just keeps creating trouble for me.
		'class-methods-use-this': 'off',
	},
};
