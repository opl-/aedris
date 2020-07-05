import Vue from 'vue';

import createApp, {AppContext} from './createApp';

export default function startApp(context: AppContext): Promise<Vue> {
	return createApp(context).then((app) => new Promise((resolve) => {
		app.root.$router.onReady(() => {
			resolve(app.root);
		});

		return app.root;
	}));
}
