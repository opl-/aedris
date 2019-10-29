const moduleNameTest = /^(?:@[a-z0-9\-_]+?\/)?[a-z0-9\-_]+(?=$|\/)/;

// TODO: this might include files included from externals using relative paths

export default function externalsGenerator({whitelist} = {whitelist: /./}) {
	return function externals(context: string, request: string, callback: (err: any, result: string | undefined) => void): void {
		// Ignore @aedris/entry and @aedris/dynamic imports: those are special and handled by other parts of the code
		if (/^@aedris\/(?:entry|dynamic)(?:\/.+)?$/.test(request)) return void callback(undefined, undefined);

		callback(undefined, moduleNameTest.test(request) && !whitelist.test(request) ? `commonjs ${request}` : undefined);
	};
}
