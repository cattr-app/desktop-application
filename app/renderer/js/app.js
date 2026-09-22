import '../scss/app.scss';
import {ipcRenderer} from 'electron';
import Vue from 'vue';
import IPCRouter from '@amazingcat/electron-ipc-router';
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

