import debug from 'debug';
import {AsyncSeriesHook, SyncWaterfallHook} from 'tapable';

import {AedrisConfigHandler, AedrisConfigHandlerOptions, AedrisPluginConfig} from './AedrisConfigHandler';
import AedrisPlugin from './AedrisPlugin';
import PluginManager from './PluginManager';
import BuildTask from './task/BuildTask';
import CleanTask from './task/CleanTask';
import {TaskLike} from './task/Task';

const log = debug('aedris:build-tools:ToolsManager');

export interface ToolsManagerOptions extends AedrisConfigHandlerOptions {}

export default class ToolsManager extends PluginManager<AedrisPlugin> {
	hooks = {
		afterRawConfig: new AsyncSeriesHook<ToolsManager>(['toolsManager']),
		normalizeConfig: new SyncWaterfallHook<AedrisPluginConfig>(['config']),
		afterConfig: new AsyncSeriesHook<ToolsManager>(['toolsManager']),
		registerTasks: new AsyncSeriesHook<ToolsManager>(['toolsManager']),
	};

	tasks: Record<string, TaskLike> = {
		'@aedris/build-tools:build': BuildTask,
		'@aedris/build-tools:clean': CleanTask,
	};

	configHandler: AedrisConfigHandler;

	constructor(opts: ToolsManagerOptions) {
		super();

		this.configHandler = new AedrisConfigHandler(opts);
	}

	get config() {
		return this.configHandler.config;
	}

	async load(): Promise<ToolsManager> {
		log('Loading ToolsManager');

		await this.configHandler.loadConfig();
		await this.hooks.afterRawConfig.promise(this);

		await this.loadPluginsFromConfig();

		log('Passing config to plugins');
		this.configHandler.config = this.hooks.normalizeConfig.call(this.config);

		log('Config loaded');

		await this.hooks.afterConfig.promise(this);

		log('Creating tasks');
		await this.hooks.registerTasks.promise(this);

		log('ToolsManager loaded');
		return this;
	}

	async loadPluginsFromConfig() {
		log('Loading plugins');

		await this.loadPlugins(this.config.plugins, {
			resolvePaths: [
				// Try to resolve plugins from the project directory
				this.config.rootDir,
			],
		});
	}

	async doApplyPlugin(plugin: AedrisPlugin) {
		// Call hook only if it exists
		if (plugin && typeof plugin.hookTools === 'function') await plugin.hookTools(this);
	}

	registerTask(taskName: string, taskConstructor: TaskLike) {
		log('Registering task %s', JSON.stringify(taskName));

		this.tasks[taskName] = taskConstructor;
	}
}
