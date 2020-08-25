import {AedrisPluginConfig} from './AedrisConfigHandler';
import {Builder} from './Builder';
import {ToolsManager} from './ToolsManager';

export interface AedrisPlugin {
	// TODO: access to the config also gives access to other plugins' options. this can result in access to not normalized options and errors. figure out a solution
	normalizeOptions?(options: any, config: AedrisPluginConfig): any;

	hookTools?(toolManager: ToolsManager): any | Promise<any>;

	hookBuild?(builder: Builder): any | Promise<any>;
}
