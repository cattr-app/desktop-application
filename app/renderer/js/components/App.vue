<template>
  <div class="application">
    <router-view />
    <canvas
      ref="screen-capture"
      hidden
    />
  </div>
</template>

<script>
import Loader from './Loader.vue';
import Message from './Message.vue';
import captureScreen from '../utils/screenshot';

export default {
  name: 'App',

  components: {
    Loader,
  },

  computed: {
    authenticated() {

      return this.$store.getters.authenticated;

    },
  },

  async mounted() {

    /* Trigger update check */
    try {

      const updateRequest = await this.$ipc.request('misc/update-available', {});
      if (updateRequest.body.version) {

        const message = this
          .$t('<span>Latest version: <b>$$</b><br>Installed: <b>%%</b></span><br><br><small>You can disable update notifications in Settings</small>')
          .replace('$$', updateRequest.body.version)
          .replace('%%', updateRequest.body.current);

        this
          .$confirm(message, this.$t('Update is available'), {
            dangerouslyUseHTMLString: true,
            confirmButtonText: this.$t('Download update'),
            cancelButtonText: this.$t('Skip'),
          })
          .then(() => {

            // Trigger navigation to downloads page
            // WebContents watcher will prevent this navigation within Renderer ctx,
            // instead it'll open this URL by shell.openExternal
            window.location.href = updateRequest.body.downloadsPageUrl;

          }).catch(() => {});

      }

    } catch (_) {
      // Do nothing
    }

    /* Show UI notification within app window */
    this.$ipc.serve('misc/ui-notification', async req => {

      let { type, message } = req.packet.body;

      // Soft-fail unknown types to message
      if (!['success', 'warning', 'message', 'error'].includes(type))
        type = 'message';

      // Covert object-ish messages to JSON before display
      if (typeof message === 'object')
        message = JSON.stringify(message);

      this.$message({
        message,
        type,
        duration: (type === 'error') ? 0 : 10000, // Do not autohide errors
        showClose: true,
      });

    });

    /* Capture screenshot */
    this.$ipc.serve('misc/capture-screenshot', async req => {

      try {

        // Capturing screenshots
        let screenshot = null;

        // Retrying screenshot capture for three times
        let retryIteration = 0;
        while (retryIteration < 3) {

          try {

            // eslint-disable-next-line no-await-in-loop
            screenshot = await captureScreen(this.$refs['screen-capture']);
            break;

          } catch (err) {

            if (retryIteration === 2)
              throw err;

            retryIteration += 1;

          }

        }

        // Respond
        return req.send(200, { screenshot });

      } catch (error) {

        const stringifiedError = JSON.stringify(error, Object.getOwnPropertyNames(error));

        // Show error
        this.$msgbox({
          title: this.$t('Error occurred during screenshot capture'),
          message: this.$createElement(Message, {
            props: {
              title: this.$t('Error occurred during screenshot capture'),
              message: stringifiedError,
            },
          }),
          confirmButtonText: this.$t('OK'),
          callback: () => {},
        });

        // Return error to backend
        return req.send(400, { stringifiedError });

      }

    });

    this.$store.dispatch('showLoader');
    if (this.$i18n.locale === 'ru')
      document.title = this.$t('Cattr');

    const auth = await this.$ipc.request('auth/is-authentication-required', {});
    this.$store.commit('setAuthenticatedStatus', !auth.body.required);

    if (!this.authenticated) {

      this.$router.push({ name: 'auth.login' });
      this.$store.dispatch('hideLoader');

    } else {

      const projects = await this.$ipc.request('projects/sync', {});
      const tasks = await this.$ipc.request('tasks/sync', {});
      this.$store.dispatch('syncTasks', tasks.body);
      this.$store.dispatch('syncProjects', projects.body);
      const totalTime = await this.$ipc.request('time/total', {});
      this.$store.dispatch('totalTimeSync', totalTime.body);
      this.$store.dispatch('hideLoader');

      this.$router.push({ name: 'user.tasks' });

    }

    this.$ipc.serve('misc/update-not-synced-amount', () => {

      this.updateNotSyncedAmount();

    });
    this.updateNotSyncedAmount();

  },

  methods: {
    closeWindow() {

      this.$ipc.emit('window/controls-close', {});

    },

    minimizeWindow() {

      this.$ipc.emit('window/controls-minimize', {});

    },

    async updateNotSyncedAmount() {

      try {

        // Fetch intervals from main process
        const req = await this.$ipc.request('interval/not-synced-amount', {});

        if (req.code !== 200)
          throw new Error(req.body.message);

        const { amount } = req.body;

        this.$store.commit('notSyncedAmount', { amount });

      } catch (err) {

        this.$message({ type: 'error', message: `${this.$t('Error')}: ${err}` });

      }

    },
  },
};
</script>

<style lang="scss" scoped>
    .application {
        max-height: 100%;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }
</style>
