import {AsyncSeriesHook} from 'tapable';

import {Builder} from '..';
import BuildTask from './BuildTask';
import Task, {InferredRunOptions} from './Task';

export default class CleanTask extends Task {
	static command = {
		command: 'clean',
		describe: 'Clean an Aedris project',
	};

	hooks = {
		builderCreated: new AsyncSeriesHook<Builder, CleanTask>(['builder', 'cleanTask']),
		beforeClean: new AsyncSeriesHook<CleanTask>(['cleanTask']),
		afterClean: new AsyncSeriesHook<CleanTask>(['cleanTask']),
	};

	builder: Builder;

	async run({configPath}: InferredRunOptions<typeof CleanTask>): Promise<void> {
		this.builder = new Builder({
			configPath,
		});

		// Needs local plugins to determine any output dirs created by targets outside the config.outputDir
		BuildTask.addLocalPluginSupport(this.builder);

		await this.hooks.builderCreated.promise(this.builder, this);

		await this.builder.load();

		await this.hooks.beforeClean.promise(this);

		await this.builder.cleanOutputs();

		await this.hooks.afterClean.promise(this);
	}
}
