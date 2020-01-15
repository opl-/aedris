import {IncomingMessage, ServerResponse} from 'http';
import {Middleware} from 'koa';

export default function expressMiddlewareWrapperFactory(middleware: (req: IncomingMessage, res: ServerResponse, next: (err?: any) => void) => any): Middleware {
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
