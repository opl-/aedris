import Backend from './Backend';
import {FrameworkKoaPlugin} from './FrameworkKoaPlugin';

export {
	Backend,
	FrameworkKoaPlugin,
};

export function createAedrisPlugin() {
	return new FrameworkKoaPlugin();
}
