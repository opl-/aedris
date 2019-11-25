import {Builder} from './Builder';
import ToolsManager from './ToolsManager';

export default interface AedrisPlugin {
	normalizeOptions?(options: any): any;

	hookTools?(toolManager: ToolsManager): any | Promise<any>;

	hookBuild?(builder: Builder): any | Promise<any>;
}
