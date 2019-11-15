import {Builder} from '..';
import BuildTask from './BuildTask';
import Task, {InferredRunOptions} from './Task';

export default class CleanTask extends Task {
	static command = {
		command: 'clean',
		describe: 'Clean an Aedris project',
	};

	builder: Builder;

	async run({configPath}: InferredRunOptions<typeof CleanTask>): Promise<void> {
		this.builder = new Builder({
			configPath,
		});

		// Needs local plugins to determine any output dirs created by targets outside the config.outputDir
		BuildTask.addLocalPluginSupport(this.builder);

		await this.builder.load();

		await this.builder.cleanOutputs();
	}
}
