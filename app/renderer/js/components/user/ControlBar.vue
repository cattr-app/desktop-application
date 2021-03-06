<template>
  <el-container class="control-bar">
    <el-input
      v-model="searchPattern"
      class="search"
      :placeholder="$t('Search...')"
      @focus="setSearchFieldState(true)"
      @blur="setSearchFieldState(false)"
    />
    <el-button
      v-if="!searchFieldActive && $route.path === '/user/tasks'"
      type="secondary"
      circle
      :disabled="syncInProgress || isTrackerLoading"
      @click="syncTasks"
    >
      <i
        class="el-icon-refresh"
        :class="{ animated: syncInProgress}"
      />
    </el-button>
    <el-button
      v-if="!searchFieldActive && $route.path === '/user/tasks'"
      :loading="reportGenerationInProgress"
      type="secondary"
      icon="el-icon-s-order"
      circle
      @click="getReport"
    />
    <el-button
      v-if="!searchFieldActive && $route.path === '/user/tasks'"
      type="secondary"
      icon="el-icon-setting"
      circle
      @click="goTo('/user/settings')"
    />
    <el-button
      v-if="!searchFieldActive && $route.path !== '/user/tasks'"
      type="secondary"
      icon="el-icon-close"
      circle
      @click="goBack()"
    />
  </el-container>
</template>

<script>
import { clipboard } from 'electron';

export default {

  name: 'SearchBar',
  props: {
    isTrackerLoading: Boolean,
  },

  data() {

    return {
      searchPattern: null,
      reportGenerationInProgress: false,
      syncInProgress: false,
      searchFieldActive: false,
    };

  },

  computed: {

    isOffline() {

      return this.$store.getters.isOffline;

    },

  },

  watch: {

    searchPattern() {

      if (this.$route.name !== 'user.tasks' && this.$route.name !== 'user.project')
        this.$router.push({ name: 'user.tasks' });

      this.setSearchPattern();

    },
  },

  async mounted() {

    // Removing focus on ESC button press
    document.addEventListener('keydown', event => {

      if (event.keyCode === 27)
        document.activeElement.blur();

    });

  },

  methods: {

    setSearchFieldState(state) {

      this.searchFieldActive = state;

    },

    setSearchPattern() {

      this.$store.dispatch('setSearchPattern', this.searchPattern);

    },

    goTo(where) {

      this.$emit('load-task-position', null);

      this.$router.push({ path: where });

    },

    goBack() {

      this.$router.push({ name: 'user.tasks' });

    },

    async syncTasks() {

      this.syncInProgress = true;
      await this.$ipc.request('projects/sync', {});
      const tasks = await this.$ipc.request('tasks/sync', {});
      const totalTime = await this.$ipc.request('time/total', {});
      this.$store.dispatch('totalTimeSync', totalTime.body);
      this.$store.dispatch('syncTasks', tasks.body);
      this.syncInProgress = false;

    },

    async returnEmptyError() {

      this.reportGenerationInProgress = false;
      this.$alert(
        this.$t('Your daily report is empty. Get back and do some work before!'),
        this.$t('Daily report'),
        {
          confirmButtonText: this.$t('OK'),
          messageType: 'warning',
          callback: () => {},
        },
      );

    },

    async getReport() {

      this.reportGenerationInProgress = true;
      const req = await this.$ipc.request('time/daily-report', {});

      // Check statuses
      switch (req.code) {

        // OK
        case 200:
          break;

        // Offline Mode
        case 422:
          this.reportGenerationInProgress = false;
          this.$alert(
            this.$t('Your daily report is unavailable in offline mode'),
            this.$t('Network is not available ✈️'),
            {
              confirmButtonText: this.$t('OK'),
              messageType: 'error',
              callback: () => {},
            },
          );
          return;

        // Empty report
        case 204:
          this.reportGenerationInProgress = false;
          this.returnEmptyError();
          return;

        default:
          this.reportGenerationInProgress = false;
          this.$alert(
            this.$t('Error occured during report export'),
            `<pre>${JSON.stringify(req)}</pre>`,
            {
              confirmButtonText: this.$t('OK'),
              messageType: 'error',
              callback: () => {},
            },
          );
          return;

      }
      // Report buffer contains prepared report
      let reportBuffer = '';

      // Preparing report in human-readable format
      req.body.projects.forEach(project => {

        // Add project name
        reportBuffer += `**${project.name}**\n\n`;

        // Add all related tasks
        project.tasks.forEach(task => {

          const hrs = Math.floor(task.trackedTime / 3600);
          const mins = Math.floor((task.trackedTime % 3600) / 60);

          reportBuffer += `_${task.name.trim()}${task.url ? ` (${task.url})` : ''}_\n${hrs}h ${mins}m\n...\n\n`;

        });

      });

      if (reportBuffer !== '') {

        this.$confirm(
          this.$t('Your daily report is ready. In which format you\'d like to export it?'),
          this.$t('Daily report'),
          {
            distinguishCancelAndClose: true,
            confirmButtonText: this.$t('Markdown'),
            cancelButtonText: this.$t('Plain text'),
            messageType: 'success',
            customClass: 'rg-msg',
            center: true,
          },

        ).then(() => {

          this.$message({
            type: 'success',
            message: this.$t('Report successfully copied to the clipboard'),
          });

          // Copy text to clipboard
          clipboard.writeText(reportBuffer);

        }).catch(action => {

          // We should consider "cancel" button as "Plain text" option selection
          if (action !== 'cancel')
            return;

          // Report buffer contains prepared report
          let buffer = '';

          // Preparing report in human-readable format
          req.body.projects.forEach(project => {

            // Add project name
            buffer += `${project.name}\n\n`;

            // Add all related tasks
            project.tasks.forEach(task => {

              const hrs = Math.floor(task.trackedTime / 3600);
              const mins = Math.floor((task.trackedTime % 3600) / 60);

              buffer += `${task.name.trim()}${task.url ? ` (${task.url})` : ''}\n${hrs}h ${mins}m\n...\n\n`;

            });

          });

          clipboard.writeText(buffer);

          this.$message({
            type: 'success',
            message: this.$t('Report successfully copied to the clipboard'),
            duration: 1500,
          });

        });


        // Removing spinner and show proper alert
        this.reportGenerationInProgress = false;

      } else
        this.returnEmptyError();

    },

  },
};
</script>

<style lang="scss">
    @import "../../../scss/imports/variables";

    .control-bar {
        padding: 1em 1em;

        .search {
            margin-right: 1em;
        }
    }

    .rg-msg {
        font-size: 1em;

        &__okie {
            font-size: 1em;
        }
    }

    .error-message {
        display: flex;

        .image {
            width: 25%;

            img {
                width: 100%;
            }
        }

        .text {
            margin-left: 1em;
            display: flex;
            flex-direction: column;
            justify-content: center;

            code {
                padding: .5em;
                background-color: $--color-danger-lighter;
                border-radius: .5em;
                border: 1px solid $--color-danger-light;
                color: $--color-danger;
            }
        }
    }
</style>
