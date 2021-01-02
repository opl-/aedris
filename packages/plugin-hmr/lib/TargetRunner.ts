import {BuildTarget} from '@aedris/build-tools';
import cp, {ChildProcess, ChildProcessWithoutNullStreams} from 'child_process';
import debug from 'debug';
import path from 'path';
import {Compiler} from 'webpack';

import {HMRPluginOptions} from './HMRPluginOptions';

const HOOK_NAME = '@aedris/plugin-hmr';

function wait(timeout: number): Promise<void> {
	if (timeout <= 0) return Promise.resolve();

	return new Promise((resolve) => setTimeout(() => resolve(), timeout));
}

export interface EntryProcessStatus {
	/** `true` if the process is being deliberately stopped. */
	exiting: boolean;
}

export class TargetRunner {
	private log: debug.Debugger;

	target: BuildTarget;
	options: Exclude<HMRPluginOptions, false>;

	/** Set if the webpack bundles are being rebuilt, `null` otherwise. */
	rebuilding: {promise: Promise<void>; resolve: () => void} | null = null;

	entryProcessStatus: {[entryPointName: string]: EntryProcessStatus} = {};
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

			if (this.rebuilding) {
				this.rebuilding.resolve();
				this.rebuilding = null;
			}

			await Promise.all(Object.keys(statsJson.entrypoints).map((entryPointName) => this.handleBuilt(entryPointName)));
		});

		compiler.hooks.invalid.tap(HOOK_NAME, () => {
			const rebuilding: any = {};
			rebuilding.promise = new Promise((resolve) => {
				rebuilding.resolve = resolve;
			});
			this.rebuilding = rebuilding;
		});
	}

	async handleBuilt(entryPointName: string) {
		const options = this.options.entryPoint[entryPointName];
		if (!options) return;

		if (options.run) {
			// Start the process if it's not running, or restart it if options allow it
			const alreadyRunning = this.entryProcess[entryPointName];
			if (alreadyRunning && options.run === 'once') return;

			// Restart the process immediately
			await this.restartProcess(entryPointName, options.killTimeout, 0);
		}
	}

	/**
	 * Kills the running process if one is running, then spawns a new one after the specified delay.
	 *
	 * @param entryPointName Name of the entry point to restart the process of
	 * @param timeout Time in milliseconds to delay the restart by. If `0`, the process will be restarted as soon as possible.
	 *
	 * @returns Promise that rejects if the process could not be started, or resolves with the process instance
	 */
	async restartProcess(entryPointName: string, killTimeout: number = 30000, timeout: number = 0): Promise<ChildProcess> {
		await this.killProcess(entryPointName, killTimeout);

		await wait(timeout);

		return this.spawnProcess(entryPointName);
	}

	/**
	 * Attempts to spawn a process for the given entry point. This method will do nothing if the entry point isn't allowed to be started by the configuration or if a process is already running.
	 *
	 * If the bundle is being rebuilt, this method will wait until it completes before attempting to spawn the process.
	 *
	 * @param entryPointName Name of the entry point to start a process for
	 *
	 * @returns Promise that rejects if the process could not be started, or resolves with the process instance
	 */
	async spawnProcess(entryPointName: string): Promise<ChildProcess> {
		const options = this.options.entryPoint[entryPointName];
		if (!options) return Promise.reject();

		// If the process is already running, do nothing
		if (this.entryProcess[entryPointName]) return Promise.resolve(this.entryProcess[entryPointName]);

		this.log('Spawning process for entry %j', entryPointName);

		// If the bundle is being rebuilt, wait for the rebuild to complete
		if (this.rebuilding) {
			this.log('  Waiting for build to finish');

			await this.rebuilding.promise;
		}

		const proc = cp.spawn(options.program || 'node', options.args || [], {
			// Do not spawn a shell - less overhead, more secure, platform independent
			shell: false,
			// Open an IPC channel on top of all the other channels
			stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
			cwd: options.cwd || path.resolve(this.target.config.rootDir, this.target.config.outputDir),
		}) as ChildProcessWithoutNullStreams; // TODO: definitelytyped types for node are invalid with additional stdio args. open an issue/PR

		// Pipe the child process outputs through the parent process outputs
		if (options.printOutput === true) {
			proc.stdout.pipe(process.stdout);
			proc.stderr.pipe(process.stderr);
		}

		proc.on('exit', (exitCode, exitSignal) => {
			this.log('Process for entry %j has exit (code %j, signal %j)', entryPointName, exitCode, exitSignal);

			const {exiting} = this.entryProcessStatus[entryPointName];

			// Clean up after the process - this information is no longer needed or valid
			delete this.entryProcess[entryPointName];
			delete this.entryProcessStatus[entryPointName];

			// The process exit was requested, do not restart it
			if (exiting) return;

			// Do not restart automatically if the config says so
			if (options.restart === false) return;

			this.restartProcess(entryPointName, options.restart || 2000);
		});

		proc.on('error', (err: Error & {code: any}) => {
			console.error(`[plugin-hmr] Process for target ${JSON.stringify(this.target.name)}, entry point ${JSON.stringify(entryPointName)} errored: ${err}`);

			if (err.code === 'ERR_IPC_CHANNEL_CLOSED') {
				// TODO: handle failures to send an IPC message
			}
		});

		this.entryProcess[entryPointName] = proc;
		this.entryProcessStatus[entryPointName] = {
			exiting: false,
		};

		return new Promise((resolve, reject) => {
			// For some reason node devs decided that throwing errors that they have access to immediately would be stupid, and that instead they should emit them as an event in the next tick. Hence why this mess to detect errors happening on start.
			let errored = false;

			const listener = (err: Error) => {
				errored = true;

				// The process failed to start - remove references to it
				delete this.entryProcess[entryPointName];
				delete this.entryProcessStatus[entryPointName];

				reject(err);
			};

			proc.once('error', listener);
			process.nextTick(() => {
				proc.off('error', listener);

				if (!errored) resolve(proc);
			});
		});
	}

	/**
	 * Attempts for kill the process for the given entry point.
	 *
	 * @param entryPointName Name of the entry point we want to kill the process of
	 * @param timeout Time in milliseconds until the process is forcefully killed if still running or `-1` to wait forever
	 *
	 * @returns A promise that will resolve when no process is running for the entry point
	 */
	killProcess(entryPointName: string, timeout: number = 30000): Promise<void> {
		return new Promise((resolve) => {
			let timeoutID: NodeJS.Timeout;

			const proc = this.entryProcess[entryPointName];
			if (!proc) return void resolve();

			this.log('Requesting process for entry %j to terminate', entryPointName);

			// Mark the process as exiting to prevent it from getting immediately restarted
			this.entryProcessStatus[entryPointName].exiting = true;

			proc.on('exit', () => {
				if (timeoutID !== undefined) clearTimeout(timeoutID);

				resolve();
			});

			if (timeout !== -1) {
				timeoutID = setTimeout(() => {
					this.log('Kill timeout for entry %j exceeded', entryPointName);

					proc.kill('SIGKILL');
				}, timeout);
			}

			proc.kill();
		});
	}

	/**
	 * Calls `TargetRunner.killProcess` for all running processes.
	 *
	 * @param timeout Time in milliseconds until the process is forcefully killed if still running or `-1` to wait forever
	 */
	async killAllProcesses(timeout?: number) {
		return Promise.all(Object.keys(this.entryProcess).map((entryPointName) => this.killProcess(entryPointName, timeout)));
	}
}
