import './extend-runtime-types';

import {GlueKoaVuePlugin} from './GlueKoaVuePlugin';

export {
	GlueKoaVuePlugin,
};

export function createAedrisPlugin() {
	return new GlueKoaVuePlugin();
}
