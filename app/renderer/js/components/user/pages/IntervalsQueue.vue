<template>
  <el-container class="queue-container">
    <div class="header">
      <h1 class="header__section-label">
        {{ $t('Recent intervals') }}
      </h1>
    </div>
    <template v-if="isIntervalFetchFinished">
      <div class="intervals">
        <IntervalViewBig
          v-for="interval in intervals"
          :key="interval.id"
          :interval="interval"
        />
      </div>
    </template>
  </el-container>
</template>

<script>
import IntervalViewBig from '../intervals/IntervalViewBig.vue';

export default {
  name: 'IntervalsQueue',

  components: { IntervalViewBig },

  data() {

    return {

      /**
         * Current status of the initial intervals fetch
         * @type {Boolean}
         */
      isIntervalFetchFinished: false,

      /**
         * Array of fetched intervals
         * @type {Object[]}
         */
      intervals: [],

    };

  },

  async mounted() {

    /* Fetch latest intervals */
    (async () => {

      // Show loader
      this.$store.dispatch('showLoader');

      try {

        // Fetch intervals from main process
        const req = await this.$ipc.request('interval/get-intervals-queue', {});
        if (req.code !== 200)
          throw new Error(req.body.message);

        // Fullfill internal buffers
        req.body.forEach(interval => this.intervals.push(interval));
        this.isIntervalFetchFinished = true;

      } catch (err) {

        this.$message({ type: 'error', message: `${this.$t('Error')}: ${err}` });

      }

      // Hide loader
      this.$store.dispatch('hideLoader');

    })();

  },

};
</script>

<style lang="scss">
  @import "../../../../scss/imports/variables";

  .queue-container {

    flex-direction: column;
    padding: 1em 1.5em;

    .header {
      display: flex;
      flex-flow: row nowrap;
      justify-content: space-between;
      align-items: center;
      border-bottom: $--border-base;
      padding-bottom: .5em;
      font-size: 1.5rem;

      &__section-label {
        margin: 0;
        font-size: 1.5rem;
      }

      &.header-fixed {
        position: fixed;
        background: rgba(255, 255, 255, 0.3);
        width: 100%;
      }

    }

    .intervals {

      div:last-of-type {

        border-bottom: none;

      }

    }

  }

</style>
