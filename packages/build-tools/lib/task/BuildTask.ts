import debug from 'debug';
import {constants as fsConstants, promises as fs} from 'fs';
import path from 'path';
import {inspect, InspectOptions} from 'util';
import yargs from 'yargs';

import {Builder, DefaultContext} from '..';
import Task, {InferredRunOptions} from './Task';
import {AedrisConfigHandler, AedrisPluginConfig} from '../AedrisConfigHandler';

const HOOK_NAME = '@aedris/build-tools:BuildTask';
const LOCAL_PLUGIN_OUTPUT_DIR = './.cache/aedris/local-plugin/';

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

		BuildTask.addLocalPluginSupport(this.builder, {configPath});

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

	static addLocalPluginSupport(builder: Builder, {configPath}: {configPath: string}) {
		// Compile local plugins written in TypeScript
		builder.hooks.afterRawConfig.tapPromise(HOOK_NAME, async (b) => {
			if (!b.rawConfig?.plugins) return;

			const localPluginPaths: string[] = [];

			// eslint-disable-next-line no-param-reassign
			b.rawConfig.plugins = b.rawConfig.plugins.map((plugin) => {
				if (!plugin.startsWith('.') || !plugin.endsWith('.ts')) return plugin;

				localPluginPaths.push(plugin);

				// Rewrite the local plugin path to point to the compiled plugin
				return path.resolve(LOCAL_PLUGIN_OUTPUT_DIR, path.dirname(plugin), `${path.basename(plugin, '.ts')}.js`);
			});

			log('Found %i local plugins to compile', localPluginPaths.length);

			if (localPluginPaths.length > 0) {
				// Create a new Builder to build the local plugins
				const localPluginBuilder = new Builder({
					config: AedrisConfigHandler.normalizeConfig(path.dirname(configPath), {
						isPlugin: true,
						outputDir: LOCAL_PLUGIN_OUTPUT_DIR,
					}),
				});

				localPluginBuilder.hooks.registerTargets.tap(HOOK_NAME, (lpb) => Promise.all(localPluginPaths.map(
					(pluginPath) => lpb.createTarget({
						name: `@aedris/build-tools:BuildTask:${pluginPath}`,
						context: [DefaultContext.NODE],
						entry: {
							[path.basename(pluginPath, '.ts')]: path.resolve((b.rawConfig as AedrisPluginConfig).rootDir, pluginPath),
						},
						outputDir: path.dirname(pluginPath),
					}),
				)));

				log('Compiling local plugins');

				await localPluginBuilder.load();
				await localPluginBuilder.build();

				log('Finished compiling local plugins');
			}
		});
	}
}
