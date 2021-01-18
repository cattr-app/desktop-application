<template>
  <div class="interval__view_big">
    <p class="interval__view__name">
      <span>{{ interval.Task.name }}</span>

      <!-- Interval is synced to server -->
      <el-tooltip
        v-if="interval.synced"
        class="item"
        effect="dark"
        placement="top"
        :content="$t('Synced to server')"
      >
        <i class="el-icon-circle-check" />
      </el-tooltip>

      <!-- Offline interval -->
      <el-tooltip
        v-else
        class="item"
        effect="dark"
        placement="top"
        :content="$t('Not synced yet')"
      >
        <i class="el-icon-circle-close" />
      </el-tooltip>
    </p>
    <div class="interval__view_info">
      <small>{{ dateFormatted }} ({{ durationFormatted }})</small>
      <el-tooltip
        class="item"
        effect="dark"
        placement="top"
        :content="$t('Remove')"
      >
        <el-button
          type="text"
          icon="el-icon-delete"
          style="color: red"
          @click="removeInterval"
        />
      </el-tooltip>
    </div>
    <img
      :src="`data:image/png;base64,${interval.screenshot}`"
      class="screenshot"
    >
  </div>
</template>
<script>
import { splitSecondsIntoHMS } from '../../../helpers/time-format.helper';
import { secondsBetween } from '../../../helpers/time-between.helper';

export default {

  name: 'IntervalViewBig',
  props: {

    /**
     * Queued interval object
     * @type {Object}
     */
    interval: {
      type: Object,
      required: true,
    },

  },

  computed: {

    /**
     * Returns formatted end datetime of the interval
     * @returns {String}
     */
    dateFormatted() {

      const endAtDate = new Date(this.interval.endAt);
      const [, month, date, year] = endAtDate.toDateString().split(' ');
      const time = endAtDate.toTimeString().split(' ')[0];
      return `${month} ${date}, ${year} — ${time}`;

    },

    /**
     * Returns interval duration in format like "1h 53m 14s"
     * @type {String}
     */
    durationFormatted() {

      const duration = splitSecondsIntoHMS(secondsBetween(this.interval.startAt, this.interval.endAt));
      let formattedString = '';

      if (duration.hours && duration.hours > 0)
        formattedString += `${duration.hours}${this.$t('h')} `;

      if (duration.minutes && duration.minutes > 0)
        formattedString += `${duration.minutes}${this.$t('m')} `;

      if (duration.seconds && duration.seconds > 0)
        formattedString += `${duration.seconds}${this.$t('s')}`;

      if (formattedString.length === 0)
        formattedString = `0${this.$t('s')}`;

      return formattedString;

    },

  },

  methods: {

    /**
     * Removes the selected interval
     * @async
     */
    async removeInterval() {

      // Show loader
      this.$store.dispatch('showLoader');

      try {

        // Requesting an interval removal operations on main process
        const req = await this.$ipc.request('interval/remove', { id: this.interval.id });

        // Throw an error if request wasn't successful
        if (req.code !== 204)
          throw new Error(req.body.message);

        // Show a success message
        this.$message({ type: 'success', message: this.$t('Interval successfully removed') });

        // Remove node itself
        this.$destroy();
        this.$el.parentNode.removeChild(this.$el);

      } catch (err) {

        this.$message({ type: 'error', message: `${this.$t('Error')}: ${err}` });

      }

      // Hide loader
      this.$store.dispatch('hideLoader');

    },

  },

};
</script>
<style lang="scss" scoped>
@import "../../../../scss/imports/variables";

.interval__view_big {

  .interval__view__name {
    margin: 1em 0 0 0;
    span {
      display: inline-block;
      max-width: 95%;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .el-icon-circle-check {
      color: green;
    }

    .el-icon-circle-close {
      color: red;
    }

    .el-tooltip {
      font-size: .8em;
      vertical-align: text-top;
    }
  }

  .interval__view_info {
    margin-top: -0.8em;
    padding-bottom: .5em;
  }

  .screenshot{
    width: 100%;
  }

  border-bottom: $--border-base;
  padding-bottom: 1.5em;
  margin: 0;

}
</style>
