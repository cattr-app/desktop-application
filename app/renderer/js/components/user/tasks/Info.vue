<template>
  <el-container class="task-info-container">
    <h1 class="task-name">
      {{ task.name }}
    </h1>
    <p class="project-name">
      {{ task.Project.name }}
    </p>
    <el-divider
      style="margin: 0;"
      class="section-divider"
    />

    <p
      v-if="descriptionPresent"
      class="task-description"
    >
      <vue-markdown class="md">
        {{ task.description }}
      </vue-markdown>
    </p>
    <p v-else>
      {{ $t('Description is empty') }}
    </p>

    <div class="task-controls">
      <el-button
        v-if="task.externalUrl !== null"
        type="secondary"
        @click="openInBrowser"
      >
        {{ $t('Open in browser') }}
      </el-button>
      <el-button
        class="task-toggler"
        :type="active ? 'success' : 'primary'"
        :plain="!active"
        @click="track"
      >
        {{ trackedTime }}
      </el-button>
    </div>
  </el-container>
</template>

<script>
import { shell } from 'electron';
import VueMarkdown from 'vue-markdown';

export default {
  name: 'Info',
  components: {
    VueMarkdown,
  },
  data() {

    return {
      taskId: this.$route.params.id,
    };

  },

  computed: {
    task() {

      return this.$store.getters.tasks.find(t => t.id === this.taskId);

    },

    active() {

      return this.task.id === this.$store.getters.task && this.$store.getters.trackStatus;

    },

    trackedTime() {

      const date = new Date(this.task.TrackedTime * 1000);
      return date.toISOString().substr(11, 8);

    },

    descriptionPresent() {

      return this.task.description && this.task.description.length > 0;

    },
  },

  methods: {
    openInBrowser() {

      if (!this.task.externalUrl || this.task.externalUrl.length === 0)
        return;

      // Check that externalUrl schema is allowed (http / https)
      try {

        const parsedUrl = new URL(this.task.externalUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol))
          return;

      } catch (err) {

        return;

      }


      shell.openExternal(this.task.externalUrl);

    },

    track() {

      if (this.active) {

        this.$store.dispatch('stopTrack', { $ipc: this.$ipc });
        this.$emit('trackEnd', this.task);

      } else {

        this.$store.dispatch('startTrack', { taskId: this.task.id, $ipc: this.$ipc });
        // this.$store.dispatch('moveTaskToBegin', this.task.id);

        this.$emit('trackStart', this.task);

      }

    },

    back() {

      // this.$router.push({ name: 'user.tasks' });
      this.$router.go(-1);

    },
  },
};
</script>

<style lang="scss">
  @import "../../../../scss/imports/variables";

  .task-info-container {
    flex-flow: column;
    padding: 1em;

    .task-name {
      margin: 0 0 .5em;
      font-size: 1.25em;
    }

    .project-name {
      color: $--color-text-secondary;
      margin-top: 0;
      font-size: .9rem;
    }

    .section-divider {
      margin: 0;
    }

    .task-description {
      padding: 1em;
      border: $--border-base;
      background-color: $--border-color-lighter;
      border-radius: .25em;

      .md {

        pre {

          white-space: pre-wrap;

        }

      }

    }

    .task-controls {
      display: flex;
      flex-flow: row;
      justify-content: space-between;

      .task-toggler {
        width: 10em;
      }
    }
  }

  .el-divider {
    margin: 0 !important;
  }
</style>
