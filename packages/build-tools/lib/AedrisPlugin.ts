import {Builder} from './Builder';
import ToolsManager from './ToolsManager';

export default interface AedrisPlugin {
	normalizeOptions?(options: any): any;

	hookTools?(toolManager: ToolsManager): void | Promise<void>;

	hookBuild?(builder: Builder): void | Promise<void>;
}
