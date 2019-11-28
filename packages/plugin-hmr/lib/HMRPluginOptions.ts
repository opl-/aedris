export interface EntryPointBehavior {
	/** Should the `webpack-hot-middleware/client` module be added to this entry? */
	hmrClient?: boolean;

	/** Whether the program should be ran when bundle is rebuilt. `'once'` runs the program only the first time the bundle is rebuilt. */
	run?: boolean | 'once';

	/** Program to be ran when the bundle builds. Defaults to `'node'`. */
	program?: string;

	/** Arguments to be passed to the program. */
	args?: string[];

	/** Working directory to switch to. Defaults to the `rootDir` of the build target. */
	cwd?: string;

	/** Time in milliseconds before the process is killed with SIGKILL after SIGTERM was sent. Defaults to 30000. */
	killTimeout?: number;
}

export type HMRPluginOptions = false | {
	/** Should the HotModuleReplacementPlugin be applied to this target's compiler? Implicitly enabled if any entry point name exists on the target unless set to `false`. */
	hmrPlugin?: boolean,

	/** Options for specific entry points in this target. */
	entryPoint: {
		[entryPointName: string]: EntryPointBehavior | undefined;
	};
};
