import debug from 'debug';
import {constants as fsConstants, promises as fs} from 'fs';
import path from 'path';
import {inspect, InspectOptions} from 'util';
import yargs from 'yargs';

import {Builder, DefaultContext} from '..';
import Task, {InferredRunOptions} from './Task';
import buildLocalPlugins from '../util/buildLocalPlugins';

const HOOK_NAME = '@aedris/build-tools:BuildTask';

const log = debug('aedris:build-tools:BuildTask');

export default class BuildTask extends Task {
	static command = {
		command: 'build',
		describe: 'Build an Aedris project',
		builder: {
			printConfig: {
				description: 'Displays the final Aedris config and exits',
				type: 'boolean' as 'boolean',
			},
			printWebpack: {
				description: 'Displays the final webpack config and exits',
				type: 'boolean' as 'boolean',
			},
			watch: {
				type: 'boolean' as 'boolean',
				alias: ['w'],
			},
		},
	};

	builder: Builder;

	async run({configPath, argv}: InferredRunOptions<typeof BuildTask>): Promise<void> {
		this.builder = new Builder({
			configPath,
		});

		BuildTask.addStandardTargets(this.builder);

		BuildTask.addLocalPluginSupport(this.builder);

		await this.builder.load();

		if (argv.printConfig || argv.printWebpack) {
			const inspectOptions: InspectOptions = {
				breakLength: Math.min(200, yargs.terminalWidth()),
				colors: true,
				depth: Infinity,
				maxArrayLength: Infinity,
			};

			if (argv.printConfig) console.log(`\n== Aedris config:\n${inspect(this.builder.config, inspectOptions)}`);

			if (argv.printWebpack) {
				if (this.builder.targets.length === 0) {
					console.log('== No targets (and therefore Webpack configs) found. Are you missing a base plugin?');
				} else {
					this.builder.targets.forEach((target) => {
						console.log(`\n== Config for target ${JSON.stringify(target.name)} (context ${JSON.stringify(target.context)}):\n${inspect(target.webpackConfig, inspectOptions)}`);
					});
				}
			}

			return;
		}

		if (argv.watch) {
			await this.builder.watch();
		} else {
			await this.builder.build();
		}
	}

	static addStandardTargets(builder: Builder) {
		// Register standard targets that are part of the Aedris structure
		builder.hooks.registerTargets.tapPromise(HOOK_NAME, async (b) => {
			if (b.config.isPlugin) {
				// Add a target for build scripts used by plugins to hook into the build automatically if one exists
				try {
					await fs.access(path.resolve(b.config.rootDir, 'lib/build.ts'), fsConstants.R_OK);

					await Promise.all([
						b.createTarget({
							name: '@aedris/build-tools:BuildTask/build-build-script',
							context: [DefaultContext.NODE],
							entry: {
								build: './lib/build.ts',
							},
							outputDir: './',
						}),
					]);
				} catch (ex) {
					// NOOP: build script doesn't exist, do nothing
				}
			}
		});
	}

	static addLocalPluginSupport(builder: Builder) {
		builder.hooks.afterRawConfig.tapPromise(HOOK_NAME, async (b) => {
			if (b.config.plugins.length === 0) return;

			log('Building local plugins');

			await buildLocalPlugins(b.config);
		});
	}
}
