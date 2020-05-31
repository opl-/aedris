import RuntimePluginLoader from './RuntimePluginLoader';

// Export a global RuntimePluginLoader instance for the whole app
const loaderInstance = new RuntimePluginLoader();
export default loaderInstance;

export {
	RuntimePluginLoader,
};
