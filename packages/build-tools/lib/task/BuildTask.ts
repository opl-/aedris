import debug from 'debug';
import {constants as fsConstants, promises as fs} from 'fs';
import path from 'path';
import {AsyncSeriesHook} from 'tapable';
import {inspect, InspectOptions} from 'util';
import yargs from 'yargs';

import {Builder, DefaultContext} from '..';
import Task from './Task';
import buildLocalPlugins from '../util/buildLocalPlugins';

const HOOK_NAME = '@aedris/build-tools:BuildTask';

const log = debug('aedris:build-tools:BuildTask');

export default class BuildTask extends Task<typeof BuildTask> {
	static command = {
		command: 'build',
		describe: 'Build an Aedris project',
		builder: {
			printConfig: {
				description: 'Displays the final Aedris config and exits',
				type: 'boolean',
			},
			printWebpack: {
				description: 'Displays the final webpack config and exits',
				type: 'boolean',
			},
			watch: {
				type: 'boolean',
				alias: ['w'],
			},
		},
	} as const;

	hooks = {
		builderCreated: new AsyncSeriesHook<Builder, BuildTask>(['builder', 'buildTask']),
	};

	builder: Builder;

	async run(): Promise<void> {
		this.builder = new Builder({
			configPath: this.configPath,
		});

		BuildTask.addStandardTargets(this.builder);

		BuildTask.addLocalPluginSupport(this.builder);

		await this.hooks.builderCreated.promise(this.builder, this);

		await this.builder.load();

		if (this.argv.printConfig || this.argv.printWebpack) {
			const inspectOptions: InspectOptions = {
				breakLength: Math.min(200, yargs.terminalWidth()),
				colors: true,
				depth: Infinity,
				maxArrayLength: Infinity,
			};

			if (this.argv.printConfig) console.log(`\n== Aedris config:\n${inspect(this.builder.config, inspectOptions)}`);

			if (this.argv.printWebpack) {
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

		if (this.argv.watch) {
			await this.builder.watch();
		} else {
			// FIXME: process needs to exit with appropriate status code on failure
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
