import {BuildTarget} from '@aedris/build-tools';
import cp, {ChildProcess, ChildProcessWithoutNullStreams} from 'child_process';
import debug from 'debug';
import {Compiler} from 'webpack';

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
		// Only hook the compiler if we are entering watch mode
		this.target.builder.hooks.beforeWatch.tap(HOOK_NAME, () => {
			this.hookCompiler(this.target.compiler!);
		});
	}

	hookCompiler(compiler: Compiler) {
		compiler.hooks.done.tapPromise(HOOK_NAME, async (stats) => {
			const statsJson = stats.toJson();
			if (!statsJson.entrypoints || !statsJson.outputPath) return;

			await Promise.all(Object.keys(statsJson.entrypoints).map((entryPointName) => this.handleBuilt(entryPointName)));
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
				// Do not spawn a shell - less overhead
				shell: false,
				// Open an IPC channel on top of all the other channels
				stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
				cwd: options.cwd || this.target.config.rootDir,
			}) as ChildProcessWithoutNullStreams; // TODO: definitelytyped types for node are invalid with additional stdio args. open an issue/PR

			// Pipe the child process outputs through the parent process outputs
			if (options.printOutput === true) {
				proc.stdout.pipe(process.stdout);
				proc.stderr.pipe(process.stderr);
			}

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
