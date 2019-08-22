import Vue from 'vue';
import UserApp from 'aedris/user-app';
import createRouter from './router';

export default function createApp() {
	const router = createRouter();

	const app = new Vue({
		router,
		render: h => h(UserApp),
	});

	return {
		app,
		router,
	};
}
