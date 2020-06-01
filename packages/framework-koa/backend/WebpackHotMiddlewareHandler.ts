import {Middleware} from 'koa';
import {AsyncSeriesHook, SyncHook} from 'tapable';
// Development only dependency
// eslint-disable-next-line import/no-extraneous-dependencies
import WebpackHotMiddleware from 'webpack-hot-middleware';

import expressMiddlewareWrapper from './util/expressMiddlewareWrapper';

type IPCMessage = {
	t: '@aedris/framework:compiler:done',
	d: any[],
} | {
	t: '@aedris/framework:compiler:invalid',
};

/**
 * This class is simultaneously a shim for webpack's Compiler that uses events sent over IPC to call hooks and a WebpackHotMiddleware handler, creating both the middleware and the Koa wrapper for it.
 */
export class WebpackHotMiddlewareHandler {
	hooks = {
		done: new AsyncSeriesHook(['stats']),
		invalid: new SyncHook([]),
	};

	onMessageBind: WebpackHotMiddlewareHandler['onMessage'];

	// TODO: config
	hotMiddleware = WebpackHotMiddleware(this as any);

	/** Hot middleware adapted for Koa. */
	wrappedKoaMiddleware: Middleware;

	/** Middleware that delays requests until the compiler done hook is called. */
	koaMiddleware: Middleware;

	buildingPromise: false | Promise<void> = false;
	private buildingPromiseResolve?: () => void;

	constructor() {
		this.wrappedKoaMiddleware = expressMiddlewareWrapper(this.hotMiddleware);

		this.koaMiddleware = async (ctx, next) => {
			if (this.buildingPromise) await this.buildingPromise;
			await this.wrappedKoaMiddleware(ctx, next);
		};

		// Add taps to handle request delaying
		this.hooks.done.tap({
			name: '@aedris/framework',
			stage: 10000,
		}, this.resolveBuildingPromise.bind(this));
		this.hooks.invalid.tap({
			name: '@aedris/framework',
			stage: -10000,
		}, this.createBuildingPromise.bind(this));

		this.onMessageBind = this.onMessage.bind(this);

		process.on('message', this.onMessageBind);
	}

	end() {
		// Resolve the building promise to prevent stuck requests
		this.resolveBuildingPromise();

		process.off('message', this.onMessageBind);
	}

	onMessage(msg: IPCMessage) {
		if (msg.t === '@aedris/framework:compiler:done') {
			this.hooks.done.promise({
				toJson: () => msg.d[0],
			});
		} else if (msg.t === '@aedris/framework:compiler:invalid') {
			this.hooks.invalid.call();
		}
	}

	createBuildingPromise() {
		this.buildingPromise = new Promise((resolve) => {
			this.buildingPromiseResolve = resolve;
		});
	}

	resolveBuildingPromise() {
		if (!this.buildingPromiseResolve) return;

		this.buildingPromiseResolve();

		this.buildingPromiseResolve = undefined;
		this.buildingPromise = false;
	}
}
