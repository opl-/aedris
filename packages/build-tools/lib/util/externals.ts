import {ExternalsQuery} from '../BuildTarget';

// Adapted from https://github.com/nodejs/node/blob/7e5d5c28ad4b2578b945854894195c49470df82a/lib/internal/modules/cjs/loader.js#L497
// `!-` are not allowed at the beginning of a request due to those being used for webpack requests (for example by the vue-loader).
const packageNameTest = /^(?:@[^/\\%]+?[/\\])?[^./\\%!-][^/\\%]*(?=$|[/\\])/;

// TODO: this might include files included from externals using relative paths

export default function externalsGenerator({whitelist} = {whitelist: /./}) {
	return function externals(query: ExternalsQuery): string | undefined {
		// Ignore @aedris/entry and @aedris/dynamic imports: those are special and handled by other parts of the code
		if (/^@aedris\/(?:entry|dynamic)(?:\/.+)?$/.test(query.request)) return undefined;

		// If the request is for any external module and isn't whitelisted, externalize it
		// eslint-disable-next-line consistent-return
		if (packageNameTest.test(query.request) && !whitelist.test(query.request)) return `commonjs ${query.request}`;

		return undefined;
	};
}
