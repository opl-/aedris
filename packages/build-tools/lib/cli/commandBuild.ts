import findUp from 'find-up';
import path from 'path';
import {inspect, InspectOptions} from 'util';
import {Argv} from 'yargs';

import {Builder} from '../Builder';
import {DefaultContext} from '../BuildTarget';

export default function createCommand(yargs: Argv): Argv {
	return yargs.command('build [options]', 'Build an Aedris project', (cmd) => {
		return cmd
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
			})
			.option('printConfig', {
				description: 'Displays the final Aedris config and exits',
				type: 'boolean',
			})
			.option('printWebpack', {
				description: 'Displays the final webpack config and exits',
				type: 'boolean',
			});
	}, async (argv) => {
		const configPath = await findUp(argv.config, {
			cwd: path.resolve(process.cwd(), argv.projectDir),
		});

		if (!configPath) return void console.error('Aedris config has not been found. Are you in the correct directory?');

		const builder = new Builder({configPath});

		builder.hooks.registerTargets.tapPromise('@aedris/build-tools/commandBuild', async (b) => {
			if (b.config.isPlugin) {
				// TODO: this should absolutely not be here
				// TODO: this should probably be a separate build to remove the need for precompiling the build scripts with tsc
				await Promise.all([
					b.createTarget({
						name: '@aedris/build-tools:cmd-build-build-script',
						context: DefaultContext.BACKEND,
						entry: {
							build: './lib/build.ts',
						},
						outputDir: './',
					}),
				]);
			}
		});

		await builder.load();

		if (argv.printConfig || argv.printWebpack) {
			const inspectOptions: InspectOptions = {
				breakLength: Math.min(200, yargs.terminalWidth()),
				colors: true,
				depth: Infinity,
				maxArrayLength: Infinity,
			};

			if (argv.printConfig) console.log(`\n== Aedris config:\n${inspect(builder.config, inspectOptions)}`);

			if (argv.printWebpack) {
				if (builder.targets.length === 0) {
					console.log('== No targets (and therefore Webpack configs) found. Are you missing a base plugin?');
				} else {
					builder.targets.forEach((target) => {
						console.log(`\n== Config for target ${JSON.stringify(target.name)} (context ${JSON.stringify(target.context)}):\n${inspect(target.webpackConfig, inspectOptions)}`);
					});
				}
			}

			return;
		}

		await builder.build();
	});
}
