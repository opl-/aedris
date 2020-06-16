import Backend from './Backend';
import {FrameworkKoaPlugin} from './FrameworkKoaPlugin';
import expressMiddlewareWrapper from './util/expressMiddlewareWrapper';

export {
	Backend,
	FrameworkKoaPlugin,
	expressMiddlewareWrapper,
};

export function createAedrisPlugin() {
	return new FrameworkKoaPlugin();
}
