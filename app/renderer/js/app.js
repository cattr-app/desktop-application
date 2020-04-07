import { ipcRenderer } from 'electron';
import Vue from 'vue';
import IPCRouter from '@amazingcat/electron-ipc-router';
import * as Sentry from '@sentry/browser';
import * as Integrations from '@sentry/integrations';
import VueI18n from 'vue-i18n';
import Element from 'element-ui';
import store from './storage';
import App from './components/App.vue';
import router from './router';

Vue.use(VueI18n);
Vue.use(Element);

(async () => {

  // Initialize IPC
  Vue.prototype.$ipc = new IPCRouter(ipcRenderer);

  // Initialise Sentry
  (() => {

    // eslint-disable-next-line no-restricted-globals
    let sentryConfig = new URL(location.href);
    if (!sentryConfig.searchParams.has('sentry'))
      return;

    // Extract Sentry configuration from query params
    sentryConfig = JSON.parse(sentryConfig.searchParams.get('sentry'));

    if (!sentryConfig.enabled)
      return;

    Sentry.init({
      dsn: sentryConfig.dsnFrontend,
      release: sentryConfig.release,
      integrations: [ new Integrations.Vue({ Vue, attachProps: true }) ],
    });

    Vue.prototype.$ipc.serve(
      'auth/user-fetched',
      req => Sentry.configureScope(scope => scope.setUser({ email: req.packet.body.email })),
    );


  })();

  // Initialise translations
  const i18n = await (async () => {

    const { body } = await Vue.prototype.$ipc.request('translation/get-configuration', {});
    const { lng, resources } = body.configuration;
    const messages = {};

    Object.entries(resources).forEach(([ key, value ]) => {

      messages[key] = value.translation;

    });

    return new VueI18n({ locale: lng, silentTranslationWarn: true, messages });

  })();

  new Vue({
    router,
    store,
    i18n,
    render: h => h(App),
  }).$mount('#app');

})();

