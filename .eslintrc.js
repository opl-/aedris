const path = require('path');

// http://eslint.org/docs/user-guide/configuring
module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		sourceType: 'module',
	},
	env: {
		browser: true,
		node: true,
	},
	extends: ['airbnb-base'],
	plugins: [
		'@typescript-eslint',
	],
	settings: {
		// TODO: replace all this (minus `import/resolver.webpack`) with `extends: 'plugin:import/typescript'` (https://github.com/benmosher/eslint-plugin-import/commit/bdc05aa1d029b70125ae415e5ca5dca22250858b)
		'import/extensions': ['.js', '.ts'],
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts'],
		},
		'import/resolver': {
			webpack: {
				config: path.resolve(__dirname, 'build/webpack.base.config.js'),
			},
			node: {
				extensions: ['.js', '.ts'],
			}
	  	},
	},
	rules: {
		'import/extensions': ['error', 'always', {
			js: 'never',
			ts: 'never',
		}],
		// custom properties because airbnb is not perfect
		'space-before-function-paren': ['error', {
			anonymous: 'never',
			named: 'never',
			asyncArrow: 'always',
		}],
		'no-plusplus': 'off',
		'no-nested-ternary': 'off',
		indent: ['error', 'tab'],
		'object-curly-spacing': ['error', 'never'],
		'no-tabs': 'off',
		'no-console': 'off',
		'no-shadow': ['error', {
			builtinGlobals: true,
			allow: ['err'],
		}],
		'consistent-return': 'off',
		'class-methods-use-this': 'off',
		'max-len': ['error', 200, 4, {
			ignoreUrls: true,
			ignoreComments: false,
			ignoreRegExpLiterals: true,
			ignoreStrings: true,
			ignoreTemplateLiterals: true,
		}],
		'no-param-reassign': 'off',
		'no-throw-literal': 'off',
		'@typescript-eslint/indent': ['error', 'tab'],
		'lines-between-class-members': ['error', 'always', {
			exceptAfterSingleLine: true,
		}],
		// allow debugger during development
		'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
	},
};
