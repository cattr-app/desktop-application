<template>
  <el-container class="task-info-container">
    <h1 class="task-name">
      {{ task.name }}
    </h1>
    <p class="project-name clickable" @click="openProjectPage()">
      {{ projectName }}
    </p>

    <!-- "vue/no-v-html" rule is disabled bc renderedDescription is sanitized -->
    <!-- eslint-disable-next-line vue/no-v-html,vue/max-attributes-per-line -->
    <div
      v-if="descriptionPresent"
      class="task-description"
      v-html="renderedDescription"
    />
    <p v-else>
      {{ $t("Description is empty") }}
    </p>
    <br />

    <div class="task-controls">
      <el-button
        v-if="task.externalUrl !== null"
        type="secondary"
        @click="openInBrowser"
      >
        {{ $t("Open in browser") }}
      </el-button>
      <el-button
        :disabled="trackingLoad || loading"
        :plain="!active"
        :type="active ? 'success' : 'primary'"
        class="task-toggler"
        @click="track"
      >
        {{ trackedTime }}
      </el-button>
    </div>
  </el-container>
</template>

<script>
import marked from "marked";
import DOMPurify from "dompurify";

export default {
  name: "Info",
  components: {},
  data() {
    return {
      taskId: this.$route.params.id,

      /**
       * Is this task performs some routine (starting or stopping) right now?
       * @type {Boolean}router
       */
      loading: false,
    };
  },

  computed: {
    trackingLoad() {
      return this.$store.getters.trackLoad;
    },

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

      return DOMPurify.sanitize(marked(this.task.description || ""), {
        USE_PROFILES: { html: true },
      });
    },
    task() {
      return this.$store.getters.tasks.find((t) => t.id === this.taskId);
    },

    projectName() {
      if (this.task.Project === null) return "";

      return this.task.Project.name;
    },

    active() {
      return (
        this.task.id === this.$store.getters.task &&
        this.$store.getters.trackStatus
      );
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
      this.$router.push({
        name: "user.project",
        params: { id: this.task.projectId },
      });
    },

    openInBrowser() {
      if (!this.task.externalUrl || this.task.externalUrl.length === 0) return;

      // Check that externalUrl schema is allowed (http / https)
      try {
        const parsedUrl = new URL(this.task.externalUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) return;
      } catch (err) {
        return;
      }

      window.location.href = this.task.externalUrl;
    },

    track() {
      if (this.active) {
        this.$store
          .dispatch("stopTrack", { $ipc: this.$ipc })
          .then(() => {
            this.$emit("trackEnd", this.task);

            // Allow click only after some amount of time
            setTimeout(() => {
              this.loading = false;
            }, 500);
          })
          .catch((error) => {
            // Stop tracking
            this.$emit("trackEnd", this.task);
            this.loading = false;

            const h = this.$createElement;
            const messageContainer = h("div", null, [
              h("p", null, error.message || "Unknown error occured"),
            ]);

            if (error.error?.isApiError && error.error.trace_id) {
              messageContainer.children.push(
                h("p", null, [
                  h("b", null, "Backend traceId"),
                  h("span", null, `: ${error.error.trace_id}`),
                ])
              );
            }

            if (error.error?.context?.client_trace_id) {
                messageContainer.children.push(
                    h('p', null, [
                        h('b', null, 'Client traceId'),
                        h('span', null, `: ${error.error.context.client_trace_id}`)
                    ])
                );
            }

            // Show error message
            this.$alert(
              messageContainer,
              `${this.$t("Tracking error")} ${error.id || ""}`,
              {
                confirmButtonText: "OK",
                callback: () => {},
              }
            );
          });
      } else {
        this.$store
          .dispatch("startTrack", { taskId: this.task.id, $ipc: this.$ipc })
          .then(() => {
            this.$emit("trackStart", this.task);

            // Allow click only after some amount of time
            setTimeout(() => {
              this.loading = false;
            }, 500);
          })
          .catch((error) => {
            this.loading = false;
            const h = this.$createElement;
            const messageContainer = h("div", null, [
              h("p", null, error.message || "Unknown error occured"),
            ]);

            if (error.error?.isApiError && error.error.trace_id) {
              messageContainer.children.push(
                h("p", null, [
                  h("b", null, "Backend traceId"),
                  h("span", null, `: ${error.error.trace_id}`),
                ])
              );
            }

            if (error.error?.context?.client_trace_id) {
                messageContainer.children.push(
                    h('p', null, [
                        h('b', null, 'Client traceId'),
                        h('span', null, `: ${error.error.context.client_trace_id}`)
                    ])
                );
            }

            // Show error message
            this.$alert(
              messageContainer,
              `${this.$t("Tracking is not available")} ${error.id || ""}`,
              {
                confirmButtonText: "OK",
                callback: () => {},
              }
            );
          });
        // this.$store.dispatch('moveTaskToBegin', this.task.id);
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
    margin: 0 0 0.5em;
    font-size: 1.25em;
  }

  .project-name {
    color: $--color-text-secondary;
    margin-top: 0;
    font-size: 0.9rem;
  }

  .section-divider {
    margin: 0;
  }

  .task-description {
    padding: 1em;
    border: $--border-base;
    background-color: $--border-color-lighter;
    border-radius: 0.25em;

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
