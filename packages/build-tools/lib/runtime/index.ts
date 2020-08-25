/**
 * This file is special. It is never externalized when building the app to prevent the app's global loader instance from leaking into other apps.
 * Unfortunately, due to the current implementation of the `util/externals` it is impossible to not externalize this module while externalizing all of its dependencies, so any new imports in this
 * file need to be added to the `webpack.base.ts`.
 */
// FIXME: remove above comment after `util/externals` is fixed

import {RuntimePlugin, RuntimePluginLoader, RegisteredRuntimePlugin} from './RuntimePluginLoader';

// Export a global RuntimePluginLoader instance for the whole app
const loaderInstance = new RuntimePluginLoader();
export default loaderInstance;

export {
	RegisteredRuntimePlugin,
	RuntimePlugin,
	RuntimePluginLoader,
};
