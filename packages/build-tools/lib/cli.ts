#!/usr/bin/env node

// Use source-map-support to improve error logging for any build tools errors
import 'source-map-support/register';

import findUp from 'find-up';
import path from 'path';
import yargs, {Argv} from 'yargs';

import {TaskError} from './task/TaskError';
import {ToolsManager} from './ToolsManager';
import {buildLocalPlugins} from './util/buildLocalPlugins';

const HOOK_NAME = '@aedris/build-tools:cli';

function registerProjectPathOptions(y: Argv) {
	return y.option('config', {
		description: "Name of the project's configuration file",
		alias: 'c',
		type: 'string',
		default: 'aedris.config.js',
	}).option('projectDir', {
		description: "Path to any of the project's directories",
		alias: 'p',
		type: 'string',
		default: '.',
	});
}

(async () => {
	// Parse the arguments once beforehand to figure out the config location. See https://github.com/yargs/yargs/issues/1042 and https://github.com/yargs/yargs/issues/1420
	const preparsedOpts = registerProjectPathOptions(yargs(process.argv.slice(2)))
		.help(false)
		.argv;

	const configPath = await findUp(preparsedOpts.config, {
		cwd: path.resolve(process.cwd(), preparsedOpts.projectDir),
	});

	if (!configPath) return void console.error('Aedris config has not been found. Are you in the correct directory?');

	// Initialize the ToolsManager
	const toolsManager = new ToolsManager({
		configPath,
	});

	toolsManager.hooks.afterRawConfig.tapPromise(HOOK_NAME, async () => {
		await buildLocalPlugins(toolsManager.config);
	});

	await toolsManager.load();

	// Construct the actual argument parser
	let argv = registerProjectPathOptions(yargs(process.argv.slice(2)))
		.env('AEDRIS')
		.usage('$0 <command> [options]')
		.help('help')
		.alias('help', 'h')
		.wrap(yargs.terminalWidth())
		.demandCommand();

	Object.entries(toolsManager.tasks).forEach(([taskName, TaskConstructor]) => {
		let aliases = TaskConstructor.command.aliases || [];
		if (!Array.isArray(aliases)) aliases = [aliases as string];

		argv = argv.command({
			...TaskConstructor.command,
			aliases: [...aliases, taskName],
			async handler(taskArgv) {
				console.log(`== Running task ${taskName}`);

				try {
					await toolsManager.createTask(taskName, {
						argv: taskArgv,
						configPath,
					}).run();
				} catch (ex) {
					// TODO: improve error handling and task result reporting (being able to return data from the task might be pretty useful when nesting tasks)
					if (ex instanceof TaskError) {
						console.log(`= Task failed: ${ex.message}`);
					} else {
						console.log('= Error running task:', ex);
					}

					process.exit(1);
				}
			},
		});
	});

	argv.parse();
})();
