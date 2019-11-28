# Aedris HMR support plugin

Adds support for Hot Module Replacement in watch mode.

## Usage

To enable this plugin you have to install it, add it to your Aedris config and configure it to do things for appropriate entry points. See [HMRPluginOptions](./lib/HMRPluginOptions.ts) for a full list of options.

```bash
npm install --dev @aedris/plugin-hmr
```

**aedris.config.js**

```javascript
module.exports = {
	plugins: ['@aedris/plugin-hmr'],
	options: {
		'@aedris/plugin-hmr': {
			entryPoint: {
				entryPointName: {
					hmrClient: true,
				},
			},
		},
	},
};
```
