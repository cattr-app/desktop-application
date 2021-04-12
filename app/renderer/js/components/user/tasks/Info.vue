<template>
  <el-container class="task-info-container">
    <h1 class="task-name">
      {{ task.name }}
    </h1>
    <p
      class="project-name clickable"
      @click="openProjectPage()"
    >
      {{ projectName }}
    </p>

    <!-- "vue/no-v-html" rule is disabled bc renderedDescription is sanitized -->
    <!-- eslint-disable-next-line vue/no-v-html,vue/max-attributes-per-line -->
    <div v-if="descriptionPresent" class="task-description" v-html="renderedDescription" />
    <p v-else>
      {{ $t('Description is empty') }}
    </p>
    <br>

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
import marked from 'marked';
import DOMPurify from 'dompurify';

export default {
  name: 'Info',
  components: {
  },
  data() {

    return {
      taskId: this.$route.params.id,
    };

  },

  computed: {

    renderedDescription() {

      marked.setOptions({
        pedantic: false,
        gfm: true,
        tables: true,
        breaks: false,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        xhtml: false,
      });

      return DOMPurify.sanitize(
        marked(this.task.description || ''),
        { USE_PROFILES: { html: true } },
      );

    },
    task() {

      return this.$store.getters.tasks.find(t => t.id === this.taskId);

    },

    projectName() {

      if (this.task.Project === null)
        return '';

      return this.task.Project.name;

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

    openProjectPage() {

      this.$router.push({ name: 'user.project', params: { id: this.task.projectId } });

    },

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


      window.location.href = this.task.externalUrl;

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
