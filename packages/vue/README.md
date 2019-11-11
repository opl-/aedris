# Aedris Vue support plugin

Adds support for compiling Vue components.

## Usage

To enable this plugin you have to install it and its peer dependencies, then add it to your Aedris config.

```bash
npm install --dev @aedris/vue vue-template-compiler
npm install vue vue-server-renderer
```

**aedris.config.js**

```javascript
module.exports = {
	plugins: ['@aedris/vue'],
};
```
