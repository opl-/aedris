/**
 * A standalone function for importing the default export if the module is an ES6 module.
 *
 * @param module Object to check for a default export
 * @returns The default export if available, the provided object otherwise
 */
export function importDefault(module: any): any {
	// eslint-disable-next-line no-underscore-dangle
	if (module && module.__esModule) return module.default;
	return module;
}
