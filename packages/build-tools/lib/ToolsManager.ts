import debug from 'debug';
import {AsyncSeriesHook, SyncWaterfallHook, SyncHook} from 'tapable';

import {AedrisConfigHandler, AedrisConfigHandlerOptions, AedrisPluginConfig} from './AedrisConfigHandler';
import {AedrisPlugin} from './AedrisPlugin';
import {PluginManager} from './PluginManager';
import {BuildTask} from './task/BuildTask';
import {CleanTask} from './task/CleanTask';
import {
	Constructor, InferredTaskOptions, Task, TaskLike,
} from './task/Task';

const log = debug('aedris:build-tools:ToolsManager');

export interface ToolsManagerOptions extends AedrisConfigHandlerOptions {}

export class ToolsManager extends PluginManager<AedrisPlugin> {
	hooks = {
		afterRawConfig: new AsyncSeriesHook<ToolsManager>(['toolsManager']),
		normalizeConfig: new SyncWaterfallHook<AedrisPluginConfig>(['config']),
		afterConfig: new AsyncSeriesHook<ToolsManager>(['toolsManager']),
		registerTasks: new AsyncSeriesHook<ToolsManager>(['toolsManager']),
		taskCreated: new SyncHook<Task, string>(['task', 'taskName']),
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

		Object.entries(this.registeredPlugins).forEach(([pluginName, info]) => {
			if (!info.plugin.normalizeOptions) return;

			// TODO: resolve local plugin names
			this.config.options[pluginName] = info.plugin.normalizeOptions(this.config.options[pluginName], this.config);
		});

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

	// eslint-disable-next-line consistent-return
	async doApplyPlugin(plugin: AedrisPlugin): Promise<any> {
		// Call hook only if it exists
		if (typeof plugin?.hookTools === 'function') return plugin.hookTools(this);
	}

	registerTask(taskName: string, taskConstructor: TaskLike) {
		log('Registering task %j', taskName);

		this.tasks[taskName] = taskConstructor;
	}

	/* FIXME: taskOptions can't be made to use types based on a specific task using the generic but i'm absolutely sick of fucking with typescript so i'm leaving it broken.
	it compiles so who the fuck cares. wasted 10 fucking hours on this shit. */
	createTask<
		T extends typeof Task = typeof Task,
		C extends Constructor<T> = Constructor<T>,
		I extends InstanceType<C> = InstanceType<C>,
	>(taskName: string, taskOptions: InferredTaskOptions<T>): I {
		const TaskConstructor = this.tasks[taskName];

		if (!TaskConstructor) throw new Error(`Tried to create invalid task named ${JSON.stringify(taskName)}`);

		const task = new TaskConstructor(taskOptions);

		this.hooks.taskCreated.call(task, taskName);

		return task as I;
	}
}
