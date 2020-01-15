import Vue from 'vue';

import createApp from './createApp';

export default function startApp({url}: {url: string}): Promise<Vue> {
	return createApp({
		url,
	}).then((app) => new Promise((resolve) => {
		app.root.$router.onReady(() => {
			resolve(app.root);
		});

		return app.root;
	}));
}
