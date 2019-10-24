import Koa from 'koa';
import path from 'path';
import {createBundleRenderer} from 'vue-server-renderer';

const APP_ROOT = process.env.AEDRIS_DIR || process.cwd();

const app = new Koa();

// TODO: config
const bundleRenderer = createBundleRenderer(path.resolve(APP_ROOT, 'dist/frontend-server/vue-ssr-server-bundle.json'));

app.use((ctx) => {
	console.log(`${ctx.method} ${ctx.ip} ${ctx.path}`);

	ctx.type = 'html';
	ctx.response.body = bundleRenderer.renderToStream({
		url: ctx.path,
	});
});

// TODO: config
app.listen(8080);
