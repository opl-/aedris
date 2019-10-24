const moduleNameTest = /^(?:@[a-z0-9\-_]+?\/)?[a-z0-9\-_]+(?=$|\/)/;

// TODO: this might include files included from externals using relative paths

export default function externalsGenerator({whitelist} = {whitelist: /./}) {
	return function externals(context: string, request: string, callback: (err: any, result: string | undefined) => void): void {
		callback(undefined, moduleNameTest.test(request) && !whitelist.test(request) ? `commonjs ${request}` : undefined);
	};
}
