import {inspect, InspectOptions} from 'util';
import yargs from 'yargs';

import {Builder, DefaultContext} from '..';
import Task, {InferredRunOptions} from './Task';

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
			},
		},
	};

	builder: Builder;

	async run({configPath, argv}: InferredRunOptions<typeof BuildTask>): Promise<void> {
		this.builder = new Builder({
			configPath,
		});

		this.builder.hooks.registerTargets.tapPromise('@aedris/build-tools/commandBuild', async (b) => {
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
}
