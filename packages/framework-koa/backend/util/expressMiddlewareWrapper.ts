import {IncomingMessage, ServerResponse} from 'http';
import {Middleware} from 'koa';

/**
 * A small wrapper that allows using middleware designed for Express with Koa. Note that it does not create any shims for the `req, res` objects, and as such will not work with all middleware.
 *
 * @param middleware The Express middleware we want to use under Koa
 * @returns Function with Koa's middleware signature
 */
export function expressMiddlewareWrapper(middleware: (req: IncomingMessage, res: ServerResponse, next: (err?: any) => void) => any): Middleware {
	return (ctx, next) => new Promise((resolve, reject) => {
		try {
			let callNext = false;
			let nextError: any;

			middleware(ctx.req, ctx.res, (err?: any) => {
				nextError = err;
				callNext = true;
			});

			if (callNext) {
				if (nextError) reject(nextError);
				else resolve(next());
			} else {
				ctx.respond = false;
			}
		} catch (ex) {
			reject(ex);
		}
	});
}
