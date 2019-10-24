# Aedris ESLint config for vanilla JavaScript

This config is based on the [AirBnB base config](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb-base) with a few changes.

The main change is the usage of tabs instead of spaces. Tabs allow different developers to use differente indentation levels code by simply changing the display settings of their editor. There's no need to change the file itself to do that. As a bonus they also take up less bytes!

## Usage

First, install the package:

```
npm install --save-dev @aedris/eslint-config-vanilla
```

Next, create a `.eslintrc.json` file in your project root:

```json
{
	"extends": "@aedris/vanilla"
}
```

That's it! You're now using this config.
