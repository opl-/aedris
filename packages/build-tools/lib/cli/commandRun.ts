import findUp from 'find-up';
import path from 'path';
import {Argv} from 'yargs';

import BuildTask from '../task/BuildTask';
import {TaskLike} from '../task/Task';

// TODO: load tasks from plugins
const TASKS: Record<string, TaskLike> = {
	build: BuildTask,
};

export default function createCommand(yargs: Argv): Argv {
	return yargs.command('run <task> [options]', 'Run a task', (orinCmd) => {
		let cmd = orinCmd
			.option('config', {
				description: "Name of the project's configuration file",
				alias: 'c',
				type: 'string',
				default: 'aedris.config.js',
			})
			.option('projectDir', {
				description: "Path to any of the project's directories",
				alias: 'p',
				type: 'string',
				default: '.',
			});

		Object.entries(TASKS).forEach(([taskName, TaskConstructor]) => {
			cmd = cmd.command({
				...TaskConstructor.command,
				async handler(argv) {
					const configPath = await findUp(argv.config, {
						cwd: path.resolve(process.cwd(), argv.projectDir),
					});

					if (!configPath) return void console.error('Aedris config has not been found. Are you in the correct directory?');

					console.log(`== Running task ${taskName}`);

					await new TaskConstructor().run({
						argv,
						configPath,
					});
				},
			});
		});

		return cmd;
	});
}
