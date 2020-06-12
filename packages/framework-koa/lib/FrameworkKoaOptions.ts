export interface FrameworkKoaOptions {
	/**
	 * Root directory of the backend. Should be relative to the `rootDir`. Defaults to `./backend`.
	 *
	 * If this directory contains an `index.ts` file, that file will be used as the bundle entry point.
	 * */
	backendDir: string;
}
