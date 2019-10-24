module.exports = {
	extends: [
		// Use the vanilla config as a base
		'@aedris/vanilla',
		// Apply TypeScript settings for eslint-import-plugin https://github.com/benmosher/eslint-plugin-import/blob/master/config/typescript.js
		'plugin:import/typescript',
		// Disable ESLint rules for things handled by TypeScript itself (only for TypeScript files) https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/src/configs/eslint-recommended.ts
		'plugin:@typescript-eslint/eslint-recommended',
		// Enable recommended rules for TypeScript linting
		// TODO
		// 'plugin:@typescript-eslint/recommended',
	],
	parser: '@typescript-eslint/parser',
	plugins: [
		'@typescript-eslint',
	],
	rules: {
		// == INDENTATION
		// Tabs allow different users to use different indentation levels without changing the files.
		'@typescript-eslint/indent': ['error', 'tab'],

		// == TYPESCRIPT-ESLINT REPLACEMENTS
		// Use the TypeScript specific rules (values copied from airbnb-base unless specified otherwise)
		semi: 'off',
		'@typescript-eslint/semi': ['error', 'always'],

		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': ['error', {
			vars: 'all',
			args: 'after-used',
			ignoreRestSiblings: true,
		}],

		camelcase: 'off',
		'@typescript-eslint/camelcase': ['error', {
			properties: 'never',
			ignoreDestructuring: false,
		}],

		'no-array-constructor': 'off',
		'@typescript-eslint/no-array-constructor': 'error',

		'no-use-before-define': 'off',
		'@typescript-eslint/no-use-before-define': ['error', {
			functions: true,
			classes: true,
			variables: true,
			typedefs: true,
		}],

		// Disabled by default in airbnb-base (see https://github.com/airbnb/javascript/issues/869)
		// 'func-call-spacing': 'off',

		// Disabled by default in airbnb-base
		// 'no-magic-numbers': 'off',

		'no-useless-constructor': 'off',
		'@typescript-eslint/no-useless-constructor': 'error',

		// TODO: enable when published (v2.1.0?) https://github.com/typescript-eslint/typescript-eslint/pull/762
		/* 'quotes': 'off',
		'@typescript-eslint/quotes': ['error', 'single', {
			avoidEscape: true,
		}], */

		// OTHERS
		// Import plugin isn't aware of type only imports, resulting in those being marked as error despite not causing any issues. (see https://github.com/typescript-eslint/typescript-eslint/issues/986)
		'import/no-cycle': 'off',

		// Don't require default exports, because classes
		'import/prefer-default-export': 'off',
	},
};
