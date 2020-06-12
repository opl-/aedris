import loader from '@aedris/build-tools/dist/runtime';

import {FrameworkKoaPlugin} from './FrameworkKoaPlugin';

const plugin = new FrameworkKoaPlugin();

plugin.hooks.afterLoad.tap('@aedris/framework-koa', () => {
	// TODO: config
	plugin.app.listen(8080);
});

// When running as an entry point we use a dynamic module to run the user code
// FIXME: this throws an error if the module doesn't exist
// eslint-disable-next-line import/no-unresolved
const userRouter = require('@aedris/dynamic/@aedris/framework-koa:routes');

if (userRouter && typeof userRouter.registerRoutes === 'function') userRouter.registerRoutes(plugin.app);

loader.start('@aedris/framework-koa', plugin);
