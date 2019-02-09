import Vue from 'vue';
import UserApp from 'aedris-user-app';

export default function createApp() {
	const app = new Vue({
		render: h => h(UserApp),
	});

	return {
		app,
	};
}
