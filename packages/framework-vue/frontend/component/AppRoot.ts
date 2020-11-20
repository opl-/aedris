import Vue from 'vue';

const DefaultLayout = () => import('./DefaultLayout');

export default Vue.extend({
	render(h) {
		// Use a custom layout if the route provides one
		return h(this.$router.currentRoute.matched[0]?.components?.layout || DefaultLayout, {
			attrs: {
				id: 'app',
			},
		});
	},
});
