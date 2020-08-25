import {createApp} from './createApp';

export default createApp().then((app) => {
	app.root.$router.onReady(() => {
		app.root.$mount('#app');
	});

	return app.root;
});
