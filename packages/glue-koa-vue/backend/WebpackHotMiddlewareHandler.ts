import {expressMiddlewareWrapper} from '@aedris/framework-koa/dist/index';
import {Middleware} from 'koa';
import {AsyncSeriesHook, HookMap, SyncHook} from 'tapable';
import WebpackHotMiddleware from 'webpack-hot-middleware';

interface IPCMessageDone {
	t: '@aedris/glue-koa-vue:compiler:done';
	d: {
		target: string;
		stats: any;
	};
}

interface IPCMessageInvalid {
	t: '@aedris/glue-koa-vue:compiler:invalid';
	d: {
		target: string;
	};
}

type IPCMessage = IPCMessageDone | IPCMessageInvalid;

/**
 * This class handles the WebpackHotMiddleware by:
 * - creating an express to Koa middleware wrapper to allow using it under Koa,
 * - proxying the webpack compiler `done` and `invalid` hook calls received through IPC to allow using them in the backend process.
 *
 * It also provides the `koaMiddleware` which delays all requests that reach it until all targets this handler is keeping track of are built.
 */
export class WebpackHotMiddlewareHandler {
	hooks = {
		done: new HookMap(() => new AsyncSeriesHook(['stats'])),
		invalid: new HookMap(() => new SyncHook()),
	};

	onMessageBind: WebpackHotMiddlewareHandler['onMessage'];

	hotMiddleware: ReturnType<typeof WebpackHotMiddleware>;

	/** Hot middleware adapted for Koa. */
	wrappedKoaMiddleware: Middleware;

	/** Middleware that delays requests until all compiler `done` hooks are called. */
	koaMiddleware: Middleware;

	buildingPromise: false | Promise<void> = false;
	private buildingTargets: string[] = [];
	private buildingPromiseResolve?: () => void;

	constructor() {
		// Add taps to handle request delaying
		this.hooks.done.intercept({
			factory: (key, hook) => {
				hook.tap({
					name: '@aedris/glue-koa-vue',
					stage: 10000,
				}, () => {
					// Remove the given target from the list of targets being built
					const index = this.buildingTargets.indexOf(key);
					if (index === -1) return;

					this.buildingTargets.splice(index, 1);

					// If that was the last target being built, resolve the building promise
					if (this.buildingTargets.length === 0) this.resolveBuildingPromise();
				});
				return hook;
			},
		});
		this.hooks.invalid.intercept({
			factory: (key, hook) => {
				hook.tap({
					name: '@aedris/glue-koa-vue',
					stage: -10000,
				}, () => {
					// Add the target to the list of targets being built
					if (!this.buildingTargets.includes(key)) {
						this.buildingTargets.push(key);

						// If that's the only target currently being built, create a new building promise
						if (this.buildingTargets.length === 1) this.createBuildingPromise();
					}
				});
				return hook;
			},
		});

		// Create the HMR middleware with our proxy hooks
		// TODO: config
		this.hotMiddleware = WebpackHotMiddleware({
			hooks: {
				done: this.hooks.done.for('@aedris/framework-vue:app-frontend-client'),
				invalid: this.hooks.invalid.for('@aedris/framework-vue:app-frontend-client'),
			},
		} as any);

		this.wrappedKoaMiddleware = expressMiddlewareWrapper(this.hotMiddleware);

		this.koaMiddleware = async (ctx, next) => {
			if (this.buildingPromise) await this.buildingPromise;
			await this.wrappedKoaMiddleware(ctx, next);
		};

		this.onMessageBind = this.onMessage.bind(this);

		process.on('message', this.onMessageBind);
	}

	end() {
		// Resolve the building promise to prevent stuck requests
		this.resolveBuildingPromise();

		process.off('message', this.onMessageBind);
	}

	onMessage(msg: IPCMessage) {
		if (msg.t === '@aedris/glue-koa-vue:compiler:done') {
			this.hooks.done.for(msg.d.target).promise({
				toJson: () => msg.d.stats,
			});
		} else if (msg.t === '@aedris/glue-koa-vue:compiler:invalid') {
			this.hooks.invalid.for(msg.d.target).call();
		}
	}

	createBuildingPromise() {
		if (this.buildingPromise) return;

		this.buildingPromise = new Promise((resolve) => {
			this.buildingPromiseResolve = () => {
				this.buildingPromise = false;
				this.buildingPromiseResolve = undefined;

				resolve();
			};
		});
	}

	resolveBuildingPromise() {
		if (!this.buildingPromiseResolve) return;

		this.buildingPromiseResolve();
	}
}
