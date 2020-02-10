<template>
  <el-container class="control-bar">
    <el-input
      v-model="searchPattern"
      class="search"
      :placeholder="$t('Search...')"
    />

    <el-button
      :loading="reportGenerationInProgress"
      type="primary"
      @click="getReport"
    >
      {{ $t('Report') }}
    </el-button>

    <el-button
      v-if="$route.path === '/user/tasks'"
      type="secondary"
      icon="el-icon-setting"
      circle
      @click="goTo('/user/settings')"
    />
    <el-button
      v-else
      type="secondary"
      icon="el-icon-notebook-2"
      circle
      @click="goTo('/user/tasks')"
    />
  </el-container>
</template>

<script>
import { clipboard } from 'electron';

export default {
  name: 'SearchBar',

  data() {

    return {
      searchPattern: null,
      reportGenerationInProgress: false
    };

  },

  watch: {
    searchPattern() {

      if (this.$route.name !== 'user.tasks')
        this.$router.push({ name: 'user.tasks' });

      this.setSearchPattern();

    }
  },

  methods: {
    setSearchPattern() {

      this.$store.dispatch('setSearchPattern', this.searchPattern);

    },

    goTo(where) {

      this.$router.push({ path: where });

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
              confirmButtonText: this.$t('Okay'),
              messageType: 'error',
              customClass: 'rg-msg',
              confirmButtonClass: 'rg-msg'
            }
          );
          return;

        // Empty report
        case 204:
          this.reportGenerationInProgress = false;
          this.$alert(
            this.$t('Get back and do some work before!'),
            this.$t('Your daily report is empty 📦'),
            {
              confirmButtonText: this.$t('Okay'),
              messageType: 'warning',
              customClass: 'rg-msg',
              confirmButtonClass: 'rg-msg__okie'
            }
          );
          return;

        default:
          this.reportGenerationInProgress = false;
          this.$alert(
            this.$t('Error occured during report export'),
            `<pre>${JSON.stringify(req)}</pre>`,
            {
              confirmButtonText: this.$t('Okay'),
              messageType: 'error',
              customClass: 'rg-msg',
              confirmButtonClass: 'rg-msg__okie'
            }
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

          reportBuffer += `_${task.name.trim()}${task.url ? ` (${task.url})` : ''}_\n...\n\n`;

        });

      });

      // Copy text to clipboard
      clipboard.writeText(reportBuffer);

      // Removing spinner and show proper alert
      this.reportGenerationInProgress = false;
      this.$alert(
        `🥁 ${this.$t('Report was successfully generated and copied to your clipboard')}`,
        `🎉 ${this.$t('Success!')}`,
        {
          confirmButtonText: '🌚 Okie~',
          messageType: 'success',
          customClass: 'rg-msg',
          confirmButtonClass: 'rg-msg__okie'
        }
      );

    }

  }
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
