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
        {{ task.Project.name }}
      </p>
    </el-col>
    <el-col
      class="task-controls pin"
      :span="2"
    >
      <el-button
        :class="{pinned: isPinned}"
        icon="el-icon-star-off"
        :type="'text'"
        @click="pinner"
      >
      </el-button>
    </el-col>
    <el-col
      class="task-controls"
      :span="4"
    >
    <!-- TODO: take care about right end of the row -->
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
      type: Object
    }
  },

  data() {

    return {

      /**
       * Is this task performs some routine (starting or stopping) right now?
       * @type {Boolean}
       */
      loading: false,

      /**
       * Is doubleclick prevention active on this task right now?
       * @type {Boolean}
       */
      clickProtected: false,
      breakLoading: false,
      isPinned: this.task.pinOrder == null ? false : true

    };

  },

  computed: {

    trackingLoad() {

      return this.$store.getters.trackLoad && this.task.id === this.$store.getters.trackLoad;

    },

    active() {

      return (this.task.id === this.$store.getters.task) && this.$store.getters.trackStatus;

    },

    trackedTime() {

      return formatSeconds(this.task.TrackedTime);

    }

  },

  methods: {

    /**
     * Opens this task details
     */
    openTask() {

      this.$router.push({ name: 'user.task', params: { id: this.task.id } });

    },

    openProject() {

      this.$router.push({ name: 'user.project', params: { id: this.task.projectId } });

    },

    async pinner () {

      this.isPinned = this.isPinned ? false : true;
      
      if (this.isPinned) {
        
        this.$store.dispatch('pinTask', { id: this.task.id } );

      } else {

        this.$store.dispatch('unpinTask', this.task.id );

      }

      await this.$ipc.emit('tasks/pinner', { id: this.task.id, pinOrder: this.task.pinOrder });
    
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
          .catch(data => this.$alert(data.error, 'Whoops!', { confirmButtonText: 'OK' }));

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
        .catch(data => this.$alert(data.message, data.error, { confirmButtonText: 'OK' }));

    }

  }

};

</script>

<style lang="scss">
@import "../../../../scss/imports/variables";

.task {
  border-bottom: $--border-base;
  padding: 1em;
  justify-content: space-between;

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
      /* font-size: 0.82rem; */
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
