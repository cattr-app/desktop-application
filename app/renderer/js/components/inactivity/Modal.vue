<template>
  <el-dialog
    :title="$t('Prove your activity')"
    :visible.sync="isModalVisible"
    class="inactivity-dialog"
    width="85%"
    center
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="timer">
      <template v-if="modalView === 'request'">
        <el-progress
          type="circle"
          :show-text="false"
          :percentage="progressPercentage > -1 ? progressPercentage : 0"
          :color="progressColors"
        />
        <br>
        <p class="time">
          <span class="time__left">{{ $t('%% seconds left').replaceAll('%%', (timeLeft > -1 ? timeLeft : 0)) }}</span>
        </p>
      </template>
      <template v-else>
        <p class="time time__stopped">
          {{ $t("Your timer was stopped due to inactivity") }}
        </p>
        <p class="time time__left">
          {{ $t("Time on break today: ").concat(lostTimeSeconds) }}
        </p>
      </template>
    </div>
    <span
      slot="footer"
      class="dialog-footer"
    >
      <template v-if="modalView === 'request'">
        <el-button @click="userActivityFail">{{
          $t("I'm on break")
        }}</el-button>
        <el-button
          type="primary"
          @click="userActivityProve"
        >
          {{ $t("I'm working") }}
        </el-button>
      </template>
      <template v-else>
        <el-button
          type="danger"
          @click="close"
        >
          {{ $t("OK") }}
        </el-button>
        <el-button
          type="danger"
          @click="resumeWork"
        >{{
          $t("Back to work")
        }}</el-button>
      </template>
    </span>
  </el-dialog>
</template>

<script>
import { formatSeconds } from '../../helpers/time-format.helper';

export default {
  name: 'Modal',
  data() {

    return {
      /**
       * Is inactivity modal visible?
       * @type {Boolean}
       */
      isModalVisible: false,

      /**
       * What modal view is shown now (countdown or stopwatch)
       *  - request - proof requesting view
       *  - lost - lost time counting view
       * @type {String}
       */
      modalView: 'request',

      /**
       * Colors definition for various progress circle intervals
       * @type {Array<Object>}
       */
      progressColors: [
        { color: '#f56c6c', percentage: 20 },
        { color: '#e6a23c', percentage: 40 },
        { color: '#5cb87a', percentage: 60 },
        { color: '#1989fa', percentage: 80 },
        { color: '#6f7ad3', percentage: 100 },
      ],

      /**
       * Amount of time lost (shown in modalView "lost" mode)
       * @type {Number}
       */
      timeLost: 0,

      /**
       * ID of timer assigned for lost time counting
       * @type {Number|null}
       */
      timeLostCounter: null,

      /**
       * Amount of time left for activity proving
       * @type {Number|null}
       */
      timeLeft: null,

      /**
       * Amount of percents per one time left second
       * @type {Number}
       */
      timeLeftCoefficient: 0,

      /**
       * ID of timer assigned for activity proof time left decrementing
       * @type {Number|null}
       */
      timeLeftCounter: null,

      /**
       * Protecting from repeated clicking on user decision buttons
       * @type {Boolean}
       */
      isUserActed: false,
    };

  },

  computed: {
    /**
     * Computes filling percentage of progress circle
     * @returns {Number} Percentage to fill
     */
    progressPercentage() {

      if (this.timeLeft >= 0)
        return this.timeLeft * this.timeLeftCoefficient;
      return 0;

    },

    /**
     * Computes amount of lost (on pause) time
     * @returns {Number} Amount of lost seconds
     */
    lostTimeSeconds() {

      return formatSeconds(this.timeLost);

    },
  },

  watch: {
    /**
     * Watching for time left for activity prooving
     */
    timeLeft(prev, now) {

      // We're waiting for negative time left to send proof fail to main
      if (!now || now > 0)
        return;

      // Stopping time left counting timer
      clearInterval(this.timeLeftCounter);
      this.$set(this, 'timeLeftCounter', null);

      // Reporting prove fail to main
      this.reportProofStatus(false);

    },
  },

  mounted() {

    // Showing modal on activity proof request
    this.$ipc.serve('tracking/activity-proof-request', r => this.show(r.packet.body.stopTime));

    // Resetting & closing modal if proof validated
    this.$ipc.serve('tracking/activity-proof-result-accepted', () => this.close());

    // Showing amount of lost time if acitivity is not proved
    this.$ipc.serve('tracking/activity-proof-result-not-accepted', r => this.lost(r.packet.body.totalTicks));

  },

  methods: {
    /**
     * Shows inactivity proof modal window
     * @param {Number} stopTime Proof duration in milliseconds
     */
    show(stopTime) {

      // Calculate proof duration in seconds
      const proofDuration = Math.round(stopTime / 1000);
      this.$set(this, 'timeLeft', proofDuration);

      // Calculate progress coefficient (X percents per one time left second)
      this.$set(this, 'timeLeftCoefficient', 100 / this.timeLeft);

      // Set time left decrementer
      const counterId = setInterval(
        () => this.$set(this, 'timeLeft', this.timeLeft - 1),
        1000,
      );
      this.$set(this, 'timeLeftCounter', counterId);

      // Show modal
      this.$set(this, 'isModalVisible', true);

    },

    /**
     * Shows time lost view in modal
     * @param {Number} alreadyLostTime Amount of time already lost in seconds
     */
    lost(alreadyLostTime) {

      // Ignore view switch request if modal window is hidden
      if (!this.isModalVisible)
        return;

      // Set amount of lost time to counter
      this.$set(this, 'timeLost', alreadyLostTime);

      // Set lost time increment counting timer
      const counterId = setInterval(
        () => this.$set(this, 'timeLost', this.timeLost + 1),
        1000,
      );
      this.$set(this, 'timeLostCounter', counterId);

      // Changing the view
      this.$set(this, 'modalView', 'lost');

    },

    /**
     * Closes & resets this modal parameters
     */
    close() {

      // Hiding modal window
      this.$set(this, 'isModalVisible', false);

      // Disabling timeLost counting timer
      if (this.timeLostCounter) {

        clearInterval(this.timeLostCounter);
        this.$set(this, 'timeLostCounter', null);

      }

      // Disabling timeLeft counting timer
      if (this.timeLeftCounter) {

        clearInterval(this.timeLeftCounter);
        this.$set(this, 'timeLeftCounter', null);

      }

      // Resetting variables to defaults
      this.$set(this, 'modalView', 'request');
      this.$set(this, 'timeLost', 0);
      this.$set(this, 'timeLostCounter', null);
      this.$set(this, 'timeLeft', null);
      this.$set(this, 'timeLeftCoefficient', 0);
      this.$set(this, 'isUserActed', false);

    },

    /**
     * Report proving status back to main
     * @param {Boolean} status Is activity proven
     */
    reportProofStatus(status = true) {

      this.$ipc.emit('tracking/activity-proof-result', { verified: status });

    },

    /**
     * Handle activity proof from user side
     */
    userActivityProve() {

      if (this.isUserActed)
        return;

      this.isUserActed = true;

      this.reportProofStatus(true);
      this.close();

    },

    /**
     * Handle activity fail decision from user side
     */
    userActivityFail() {

      if (this.isUserActed)
        return;

      this.isUserActed = true;

      this.reportProofStatus(false);
      this.close();

    },

    /**
     * Resuming (i.e., start tracking to the last task) work
     */
    resumeWork() {

      if (this.isUserActed)
        return;

      this.isUserActed = true;

      this.$ipc.emit('tracking/resume-work-after-inactivity', { verified: true });
      this.close();

    },
  },
};
</script>

<style lang="scss" scoped>
.inactivity-dialog {
  z-index: 99999;

  .timer {
    display: flex;
    flex-flow: column;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;

    .time {
      margin: 0;

      &__left,
      &__stopped {
        color: #f56c6c;
      }
    }
  }
}
</style>
