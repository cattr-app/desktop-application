<template>
  <div class="tracker">
    <el-row class="task">
      <el-col
        :type="'flex'"
        :span="14"
      >
        <div class="task-info">
          <template v-if="trackingTask">
            <p class="task-name">
              {{ trackingTask.name }}
            </p>
            <p class="project-name">
              {{ trackingTask.Project.name }}
            </p>
          </template>
          <template v-else>
            <p class="task-name">
              {{ $t('On pause') }}
            </p>
          </template>
        </div>
      </el-col>
      <el-col
        class="tracker-controls"
        :span="10"
      >
        <el-button
          :disabled="!trackingTask || isTrackerLoading"
          class="tracker-toggler"
          :type="trackingInProgress ? 'success' : 'danger'"
          :plain="!trackingInProgress"
          @click="track"
        >
          {{ trackedTime }}
        </el-button>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { clipboard } from 'electron';

export default {
  name: 'Tracker',
  components: {},
  props: {
    isTrackerLoading: Boolean,
  },
  data() {

    return {
      errorModal: false,
      reportSnack: false,
      trackButtonLocked: false,
    };

  },
  computed: {
    trackingLoad() {

      return this.$store.getters.trackLoad;

    },

    trackingInProgress() {

      return this.$store.getters.trackStatus;

    },

    trackingTask() {

      if (!this.$store.getters.task)
        return false;


      return this.getTask(this.$store.getters.task);

    },

    trackedTime() {

      let totalTime = 0;
      this.$store.getters.tasks.forEach(task => {

        totalTime += task.TrackedTime;

      });

      return new Date(totalTime * 1000).toISOString().substr(11, 8);

    },

  },

  mounted() {

    this.$ipc.serve('inactivity-modal/resume-work-after-inactivity', async () => {

      await this.track();

    });

  },

  methods: {

    async resumeTracking() {

      if (!this.$store.getters.task || this.$store.getters.trackStatus)
        await this.$store.dispatch('stopTrack', { $ipc: this.$ipc });
      else
        await this.$store.dispatch('startTrack', { taskId: this.$store.getters.task, $ipc: this.$ipc });

    },

    async getReport() {

      this.$store.dispatch('showLoader');
      const { body } = await this.$ipc.request('time/daily-report', {});

      // Report buffer contains prepared report
      let reportBuffer = '';

      body.projects.forEach(project => {

        // Add project name
        reportBuffer += `**${project.name}**\n\n`;

        // Add all related tasks
        project.tasks.forEach(task => {

          reportBuffer += `_${task.name.trim()}${task.url ? ` (${task.url})` : ''}_\n...\n\n`;

        });

      });

      this.$store.dispatch('hideLoader');

      clipboard.writeText(reportBuffer);
      this.reportSnack = true;

    },

    track() {

      // Double-click protection
      if (this.trackButtonLocked)
        return;
      this.trackButtonLocked = true;

      if (!this.$store.getters.task || this.$store.getters.trackStatus)
        this.$store.dispatch('stopTrack', { $ipc: this.$ipc });
      else
        this.$store.dispatch('startTrack', { taskId: this.$store.getters.task, $ipc: this.$ipc });

      setTimeout(() => this.$set(this, 'trackButtonLocked', false), 350);

    },


    getTask(taskId) {

      return this.$store.getters.tasks.find(t => t.id === taskId);

    },
  },
};
</script>

<style lang="scss" scoped>
  @import "../../../../scss/imports/variables";

  p {
    margin: 0;
  }

  .tracker {
    padding: 1em 1.5em;
    background-color: $--background-color-base;
    border-top: $--border-base;
    height: 40px;
    max-height: 40px;
    justify-content: center;
    display: flex;
    flex-direction: column;

    .task {
      padding: 0;
      display: flex;
      align-items: center;

      .task-info {
        max-width: inherit;
        padding: 0;

        p:last-of-type {
          margin: 0;
        }
      }

      .tracker-controls {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;

        .tracker-toggler {
          width: 50%;
          padding: 12px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .tracker-toggler.el-button--success:hover:enabled {
          background: #f56c6c;
          border-color: #f56c6c;
        }

        .tracker-toggler.el-button--danger:hover:enabled {
          background: #85ce61;
          border-color: #85ce61;
        }

      }
    }
  }
</style>
