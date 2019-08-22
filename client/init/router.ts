import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

// route-level code splitting
// const PageDashboard = () => import('../views/PageDashboard'); // XXX: implement
const DummyPage = () => import('./dummypage');

export default function createRouter() {
	const router = new Router({
		mode: 'history',
		linkActiveClass: 'active',
		linkExactActiveClass: 'active-exact',
		scrollBehavior(to, from, savedPosition) {
			return {
				x: 0,
				y: savedPosition ? savedPosition.y : 0,
			};
		},
		routes: import(AEDRIS_APP_CONFIG.routeDirectory),
	});

	// TODO: .onError

	return router;
}
