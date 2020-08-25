import {AsyncSeriesHook} from 'tapable';

import {Builder} from '..';
import {BuildTask} from './BuildTask';
import {Task} from './Task';

export class CleanTask extends Task<typeof CleanTask> {
	static command = {
		command: 'clean',
		describe: 'Clean an Aedris project',
	};

	hooks = {
		builderCreated: new AsyncSeriesHook<Builder, CleanTask>(['builder', 'cleanTask']),
	};

	builder: Builder;

	async run(): Promise<void> {
		this.builder = new Builder({
			configPath: this.configPath,
		});

		// Needs local plugins to determine any output dirs created by targets outside the config.outputDir
		BuildTask.addLocalPluginSupport(this.builder);

		await this.hooks.builderCreated.promise(this.builder, this);

		await this.builder.load();

		await this.builder.cleanOutputs();
	}
}
