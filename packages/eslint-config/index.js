const airbnbTypeScriptBase = require('eslint-config-airbnb-typescript/lib/shared');
const aedrisVanilla = require('@aedris/eslint-config-vanilla');

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
	parserOptions: {
		project: ['./tsconfig.json'],
	},
	plugins: [
		'@typescript-eslint',
	],
	rules: {
		// == TYPESCRIPT-ESLINT REPLACEMENTS
		// The eslint-config-airbnb-typescript package provides Airbnb compliant replacements of the default ESLint rules with their ESLint TypeScript plugin replacements.
		...airbnbTypeScriptBase.rules,

		// == INDENTATION
		// Tabs allow different users to use different indentation levels without changing the files.
		'@typescript-eslint/indent': aedrisVanilla.rules.indent,

		// == AEDRIS TWEAKS
		// Spaces in anonymous functions are a no.
		'@typescript-eslint/space-before-function-paren': aedrisVanilla.rules['space-before-function-paren'],

		// Allowing no empty lines is useful for props.
		'@typescript-eslint/lines-between-class-members': aedrisVanilla.rules['lines-between-class-members'],

		// Import plugin isn't aware of type only imports, resulting in those being marked as error despite not causing any issues. (see https://github.com/typescript-eslint/typescript-eslint/issues/986)
		'import/no-cycle': 'off',

		// Don't require default exports, because classes
		'import/prefer-default-export': 'off',
	},
	overrides: [
		// The eslint-config-airbnb-typescript package provides some fixes for .ts files using overrides.
		...airbnbTypeScriptBase.overrides,
	],
};
