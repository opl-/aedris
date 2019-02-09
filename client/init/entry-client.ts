import createApp from './app';

const {app} = createApp();

// prime the store with server-initialized state.
// the state is determined during SSR and inlined in the page markup.
// eslint-disable-next-line no-underscore-dangle
if (window.__INITIAL_STATE__) store.replaceState(window.__INITIAL_STATE__);
