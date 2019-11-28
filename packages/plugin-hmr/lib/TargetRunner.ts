import {BuildTarget} from '@aedris/build-tools';
import cp, {ChildProcess} from 'child_process';
import debug from 'debug';

import {HMRPluginOptions} from './HMRPluginOptions';

const HOOK_NAME = '@aedris/plugin-hmr';

export class TargetRunner {
	private log: debug.Debugger;

	target: BuildTarget;
	options: Exclude<HMRPluginOptions, false>;

	entryProcess: {[entryPointName: string]: ChildProcess} = {};

	constructor(target: BuildTarget) {
		this.log = debug(`aedris:plugin-hmr:TargetRunner:${target.name}`);

		this.target = target;

		const options = this.target.getPluginOptions(HOOK_NAME);
		if (options === false) throw new Error(`Tried to create TargetRunner for a target ${JSON.stringify(target.name)} which has HMR Plugin disabled`);

		this.options = options;
	}

	createHooks() {
		this.target.compiler!.hooks.done.tap(HOOK_NAME, (stats) => {
			const statsJson = stats.toJson();
			if (!statsJson.entrypoints || !statsJson.outputPath) return;

			Object.keys(statsJson.entrypoints).forEach((entryPointName) => {
				this.handleBuilt(entryPointName);
			});
		});
	}

	async handleBuilt(entryPointName: string) {
		const options = this.options.entryPoint[entryPointName];
		if (!options) return;

		if (options.run) {
			const alreadyRunning = this.entryProcess[entryPointName];

			if (alreadyRunning) {
				if (options.run === 'once') return;

				await this.killProcess(entryPointName, options.killTimeout);
			}

			this.log('Spawning process for entry %j', entryPointName);

			const proc = cp.spawn(options.program || 'node', options.args || [], {
				shell: false,
				cwd: options.cwd || this.target.config.rootDir,
			});

			proc.stdout.pipe(process.stdout);
			proc.stderr.pipe(process.stderr);

			this.entryProcess[entryPointName] = proc;
		}
	}

	async killProcess(entryPointName: string, timeout: number = 30000): Promise<void> {
		return new Promise((resolve) => {
			const proc = this.entryProcess[entryPointName];
			if (!proc) return;

			this.log('Requesting process for entry %j to terminate', entryPointName);

			proc.on('exit', () => {
				this.log('Process for entry %j has exit', entryPointName);

				resolve();
			});

			if (timeout !== -1) {
				setTimeout(() => {
					this.log('Kill timeout for entry %j exceeded', entryPointName);

					proc.kill('SIGKILL');
				}, timeout);
			}

			proc.kill();
		});
	}

	async killAllProcesses(timeout?: number) {
		return Promise.all(Object.keys(this.entryProcess).map((entryPointName) => this.killProcess(entryPointName, timeout)));
	}
}
