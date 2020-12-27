/**
 * This file is special. It is never externalized when building the app to prevent the app's global loader instance from leaking into other apps.
 * Because webpack doesn't pass the actual issuer of the module request that triggered an externals check, the only way we can determine that the request came from this module is by putting it in its own directory.
 * That means that unless another module is supposed to be bundled whenever this module is bundled, it should be put in `runtime-lib/` instead of `runtime/`.
 */

import {RuntimePlugin, RuntimePluginLoader, RegisteredRuntimePlugin} from '../runtime-lib/RuntimePluginLoader';

// Export a global RuntimePluginLoader instance for the whole app
const loaderInstance = new RuntimePluginLoader();
export default loaderInstance;

export {
	RegisteredRuntimePlugin,
	RuntimePlugin,
	RuntimePluginLoader,
};
