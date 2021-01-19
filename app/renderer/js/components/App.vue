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
import Loader from './Loader';
import Message from './Message';
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

    this.$ipc.serve('misc/capture-screenshot', async req => {

      try {

        // Capturing screenshots
        const screenshots = await captureScreen(this.$refs['screen-capture']);

        // Respond
        return req.send(200, { screenshots });

      } catch (error) {

        // Return error to backend
        req.send(400, { error });

        // Show error
        this.$msgbox({
          title: this.$t('Error occurred during screenshot capture'),
          message: this.$createElement(Message, {
            props: {
              title: this.$t('Error occurred during screenshot capture'),
              message: JSON.stringify(error),
            },
          }),
          confirmButtonText: this.$t('OK'),
        });

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

  },

  methods: {
    closeWindow() {

      this.$ipc.emit('window/controls-close', {});

    },

    minimizeWindow() {

      this.$ipc.emit('window/controls-minimize', {});

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
