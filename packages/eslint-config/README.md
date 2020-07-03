# Aedris ESLint config for TypeScript

This config is based on the [vanilla Aedris config for ESLint](../eslint-config-vanilla) which is based on the [AirBnB base config](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb-base) with a few changes.

## Usage

First, install the package:

```
npm install --save-dev @aedris/eslint-config
```

Next, create a `.eslintrc.json` file in your project root:

```json
{
	"root": true,
	"extends": "@aedris"
}
```

That's it! You're now using this config.

## Monorepos and linting in VSCode

If your project uses a monorepo format and individual `.eslintrc` files for each package, VSCode might report a problem in the form of:

* If your project doesn't have a `tsconfig.json` file in its root directory:

	```
	Parsing error: Cannot read file "<VSCode working directory>/tsconfig.json". eslint
	```

* If your project has a `tsconfig.json` file in its root directory:

	```
	Parsing error: "parserOptions.project" has been set for @typescript-eslint/parser.
	The file does not match your project config: <one of project's .ts files>.
	The file must be included in at least one of the projects provided. eslint
	```

To fix this issue, set the `eslint.workingDirectories` VSCode ESLint extension setting to one of the following values:

```js
// To automatically find all packages based on the `package.json` and `.eslint` files:
[{"mode": "auto"}]

// To use a glob to point to all packages:
[{"pattern": "packages/*"}]

// To manually specify paths to all packages:
["./client/", "./server/"]
```

See the [VSCode ESLint repository](https://github.com/Microsoft/vscode-eslint#settings-options) for more information.
