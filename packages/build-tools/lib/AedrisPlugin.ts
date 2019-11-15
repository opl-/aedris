import {Builder} from './Builder';

export default interface AedrisPlugin {
	hookBuild(builder: Builder): void | Promise<void>;
}
