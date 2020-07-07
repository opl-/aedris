export interface EntryPointBehavior {
	/** If `true`, adds the `webpack-hot-middleware/client` module to this entry. Passing a string uses it as options for the module. Defaults to `false`. */
	hmrClient?: boolean | string;

	/** Whether the program should be ran when bundle is rebuilt. `'once'` runs the program only the first time the bundle is rebuilt. Defaults to `false`. */
	run?: boolean | 'once';

	/** If the process exits without being requested to, delay the restart by this many milliseconds. If `false`, the process will not be restarted. The restart may be delayed for longer if the bundle is being rebuilt. Defaults to `2000`. */
	restart?: false | number;

	/** Program to be ran when the bundle builds. Defaults to `'node'`. */
	program?: string;

	/** Arguments to be passed to the program. */
	args?: string[];

	/** Working directory to switch to. Defaults to the `rootDir` of the build target. */
	cwd?: string;

	/** Time in milliseconds before the process is killed with SIGKILL after SIGTERM was sent. -1 to wait forever. Defaults to 30000. */
	killTimeout?: number;

	// TODO: should this be a little more comprehensive? things like disabling the ipc channel?
	/** Pipes the output of the child process through the respective outputs of the parent. Defaults to `true`. */
	printOutput?: boolean;
}

export type HMRPluginOptions = false | {
	/** Should the HotModuleReplacementPlugin be applied to this target's compiler? Implicitly enabled if any entry point name exists on the target unless set to `false`. */
	hmrPlugin?: boolean,

	/** Options for specific entry points in this target. */
	entryPoint: {
		[entryPointName: string]: EntryPointBehavior | undefined;
	};
};
