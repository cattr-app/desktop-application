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

// Comment it out to use remote devtools
if (process.env.NODE_ENV === 'development' && process.env.REMOTE_DEVTOOLS_ENABLE) {

  try {

    // eslint-disable-next-line global-require
    // const devtools = require('@vue/devtools');
    // devtools.connect();

    // eslint-disable-next-line no-console
    console.log('vue-devtools package is disabled due to the maintaining issues');

  } catch (err) {

    // eslint-disable-next-line no-console
    console.error('Error occured during Vue Devtools init', err);

  }

}

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
      integrations: [new Integrations.Vue({ Vue, attachProps: true })],

      // Patching error report right before sending to normalize frontend paths
      beforeSend: data => {

        // Filter only requests with known structure which we can modify
        if (!data || !data.exception || !data.exception.values)
          return data;

        // Iterate over exceptions
        // eslint-disable-next-line no-param-reassign
        data.exception.values = data.exception.values.map(exception => {

          // Filter only exceptions we can modify
          if (!exception.stacktrace || !exception.stacktrace.frames)
            return exception;

          // Rewrite exception file path to "build/app.js" since we always
          // building frontend into the single bundle
          // eslint-disable-next-line no-param-reassign
          exception.stacktrace.frames = exception.stacktrace.frames.map(frame => {

            // Modify only exceptions with the "filename" property
            if (frame.filename)
              frame.filename = 'build/app.js'; // eslint-disable-line no-param-reassign

            return frame;

          });

          return exception;

        });

        return data;

      },
    });

    // Populate Sentry error reports with company identifier
    Vue.prototype.$ipc.serve(
      'auth/company-instance-fetched',
      req => Sentry.configureScope(scope => scope.setTag('companyIdentifier', req.packet.body.cid)),
    );


  })();

  // Initialise translations
  const i18n = await (async () => {

    const { body } = await Vue.prototype.$ipc.request('translation/get-configuration', {});
    const { lng, resources } = body.configuration;
    const messages = {};

    Object.entries(resources).forEach(([key, value]) => {

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

