<template>
  <el-row
    ref="task"
    type="flex"
    class="task"
  >
    <el-col
      class="task-info"
      :span="18"
    >
      <p
        class="task-name clickable"
        @click="openTask"
      >
        {{ task.name }}
      </p>
      <p
        class="project-name clickable"
        @click="openProject"
      >
        {{ projectName }}
      </p>
    </el-col>
    <el-col
      class="task-controls pin"
      :span="2"
    >
      <el-button
        :class="{ pinned: isPinned }"
        icon="el-icon-star-off"
        :type="'text'"
        @click="pinner"
      />
    </el-col>
    <el-col
      class="task-controls"
      :span="4"
    >
      <!-- TODO: take care about right end of the row -->
      <!-- wooooot? I'm not sure what's supposed to be done here :( -->
      <el-button
        class="task-toggler"
        :disabled="trackingLoad || loading"
        :type="active ? 'success' : 'primary'"
        :plain="!active"
        @click="track"
      >
        {{ trackedTime }}
      </el-button>
    </el-col>
  </el-row>
</template>

<script>
import { formatSeconds } from '../../../helpers/time-format.helper';

export default {
  name: 'Task',

  props: {
    task: {
      required: true,
      type: Object,
    },
  },

  data() {

    return {
      /**
       * Is this task performs some routine (starting or stopping) right now?
       * @type {Boolean}router
       */
      loading: false,

      /**
       * Is doubleclick prevention active on this task right now?
       * @type {Boolean}
       */
      clickProtected: false,
      breakLoading: false,
      isPinned: this.task.pinOrder !== null,
    };

  },

  computed: {
    trackingLoad() {

      return (
        this.$store.getters.trackLoad
      );

    },

    active() {

      return (
        this.task.id === this.$store.getters.task
        && this.$store.getters.trackStatus
      );

    },

    trackedTime() {

      return formatSeconds(this.task.TrackedTime);

    },

    isProjectPage() {

      return this.$router.history.current.name === 'user.project';

    },

    projectName() {

      if (this.task.Project === null)
        return '';

      return this.task.Project.name;

    },

  },

  methods: {
    /**
     * Opens this task details
     */
    openTask() {

      this.$emit('load-task-position', null);

      // Avoid duplicated navigation
      if (this.$route.name === 'user.task' && this.$route.params.id === this.task.id)
        return;

      this.$router.push({ name: 'user.task', params: { id: this.task.id } });

    },

    openProject() {

      this.$emit('load-task-position', null);

      // Avoid duplicated navigation
      if (this.$route.name === 'user.project' && this.$route.params.id === this.task.projectId)
        return;

      this.$router.push({
        name: 'user.project',
        params: { id: this.task.projectId },
      });

    },

    /**
     * Adds task to a pinned list
     * @async
     */
    async pinner() {

      this.isPinned = !this.isPinned;

      if (this.isPinned)
        this.$store.dispatch('pinTask', { id: this.task.id });
      else
        this.$store.dispatch('unpinTask', this.task.id);

      await this.$ipc.emit('tasks/pinner', {
        id: this.task.id,
        pinOrder: this.task.pinOrder,
      });

    },

    /**
     * Handles task action button click
     * @async
     */
    async track() {

      // Multiclick protection
      if (this.clickProtected || this.loading)
        return;

      // Set doubleclick prevention & loading flags
      this.clickProtected = true;
      this.loading = true;

      // Stopping this task
      if (this.active) {

        this.$store
          .dispatch('stopTrack', { $ipc: this.$ipc })
          .then(() => {

            this.$emit('trackEnd', this.task);

            // Allow click only after some amount of time
            setTimeout(() => {

              this.clickProtected = false;
              this.loading = false;

            }, 500);

          })
          .catch(error => {

            // Stop tracking
            this.$emit('trackEnd', this.task);
            this.clickProtected = false;
            this.loading = false;

            // Show error message
            this.$alert(
              error.message || 'Unknown error occured',
              `${this.$t('Tracking error')} ${error.id || ''}`,
              { confirmButtonText: 'OK', callback: () => {} },
            );

          });

        return;

      }

      // Starting this task
      this.$store
        .dispatch('startTrack', { $ipc: this.$ipc, taskId: this.task.id })
        .then(() => {

          this.$emit('trackStart', this.task);

          // Allow click only after some amount of time
          setTimeout(() => {

            this.clickProtected = false;
            this.loading = false;

          }, 500);

        })
        .catch(data => {

          this.$alert(this.$t(data.error), this.$t('Tracking is not available'), { confirmButtonText: this.$t('OK'), callback: () => {} });

        });

    },
  },
};
</script>

<style lang="scss">
  @import "../../../../scss/imports/variables";
  @import "../../../../scss/misc/tasks-style-misc";

  .task {
    border-bottom: $--border-base;
    padding: 1em;
    justify-content: space-between;
    background-color: #ffffff;

    &:last-of-type {
      border: 0;
    }

    .task-controls {
      display: flex;
      align-items: center;
      justify-content: flex-end;

      .el-button {
        width: 100%;
        display: block;
        padding: 10px 0px;
        font-size: 0.82rem;
      }
    }

    .task-controls.pin {
      justify-content: center;
      width: auto;
      display: block;
    }

    .task-info {
      max-width: 75%;
      display: flex;
      flex-direction: column;
      /* padding: 0 1em 0 0; */

      p {
        margin: 0;
        max-width: 100%;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }

      .task-name {
        margin-bottom: 0.2em;
      }

      .project-name {
        font-size: $--font-size-small;
        color: $--color-text-regular;
      }
    }
  }

  .clickable {
    cursor: pointer;
    transition: $--all-transition;

    &:hover {
      color: $--color-primary-light-1;
    }
  }

  .pinned {
    color: $--color-primary-light-1 !important;

    .el-icon-star-off:before {
      content: "\e797";
    }
  }

  .el-button--text {
    color: $--color-text-regular;
  }
</style>
