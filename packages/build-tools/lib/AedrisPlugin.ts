import {Builder} from './Builder';
import ToolsManager from './ToolsManager';

export default interface AedrisPlugin {
	hookTools?(toolManager: ToolsManager): void | Promise<void>;

	hookBuild?(builder: Builder): void | Promise<void>;
}
