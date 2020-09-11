import {AedrisPluginConfig} from './AedrisConfigHandler';
import {Builder} from './Builder';
import {BuildTarget} from './BuildTarget';
import {ToolsManager} from './ToolsManager';

export interface AedrisPlugin {
	// TODO: access to the config also gives access to other plugins' options. this can result in access to not normalized options and errors. figure out a solution
	normalizeOptions?(options: any, config: AedrisPluginConfig): any;

	hookTools?(toolManager: ToolsManager): any | Promise<any>;

	hookBuild?(builder: Builder): any | Promise<any>;

	/**
	 * Used to allow the plugin to hook into a Build Target.
	 *
	 * `PluginManager.usePlugin` must not be called in this callback.
	 *
	 * @param buildTarget Build Target to hook into
	 */
	hookTarget?(buildTarget: BuildTarget): any | Promise<any>;
}
