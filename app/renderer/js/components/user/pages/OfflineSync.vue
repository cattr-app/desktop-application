<template>
  <el-container class="sync-container">
    <div class="header">
      <h1 class="header__section-label">
        {{ $t('Offline Sync') }}
      </h1>
    </div>
    <el-main>
        <el-row class="btn-wrapper">
        <p class="btn-wrapper__heading">{{ $t("You've %% not synced intervals.").replaceAll('%%', notSyncedAmount) }}</p>
            <el-button
                    type="primary"
                    :disabled="notSyncedAmount === 0"
                    @click="exportIntervals"
            >
                {{ $t('Export intervals') }}
            </el-button>
            <br>
            <small class="btn-wrapper__description">{{ $t("Don't forget to stop tracking before exporting intervals.") }}</small>

        </el-row>
    </el-main>
    <div class="sync__footer">
    </div>
  </el-container>
</template>

<script>
import {pack} from "msgpackr";

export default {
  name: 'OfflineSync',
  data() {

    return {};

  },
  computed: {
    /**
     * Returns amount of not synced intervals
     * @returns {Integer}
     */
    notSyncedAmount() {

      return this.$store.getters.notSyncedAmount;

    },
  },

  methods: {
    async exportIntervals() {
      const res = await this.$ipc.request('interval/export-deferred', {});
      if (res.code === 200) {
          try {
              const packedData = pack(res.body);
              const blob = new Blob([packedData]);

              const aElement = document.createElement('a');
              aElement.setAttribute('download', 'Intervals.cattr');
              const href = URL.createObjectURL(blob);
              aElement.href = href;
              aElement.setAttribute('target', '_blank');
              aElement.click();
              URL.revokeObjectURL(href);
          } catch (error) {
              const h = this.$createElement;
              const messageContainer = h("div", null, [
                  h("p", null, error.message ? this.$t(error.message) : "Unknown error occured"),
              ]);

              // Show error message
              await this.$alert(messageContainer, this.$t('Intervals export error'), {
                  confirmButtonText: this.$t('OK'),
                  callback: () => {
                  },
              });
          }
      } else {
          const error = res.body;

          const h = this.$createElement;
          const messageContainer = h("div", null, [
              h("p", null, error.message ? this.$t(error.message) : "Unknown error occured"),
          ]);

          if (error.error?.context?.client_trace_id) {
              messageContainer.children.push(
                  h('p', null, [
                      h('b', null, 'Client traceId'),
                      h('span', null, `: ${error.error.context.client_trace_id}`)
                  ])
              );
          }

          // Show error message
          await this.$alert(messageContainer, this.$t('Intervals export error'), {
              confirmButtonText: this.$t('OK'),
              callback: () => {
              },
          });
      }

    }
  },
};
</script>

<style lang="scss">
@import "../../../../scss/imports/variables";


.sync-container {
  flex-direction: column;
  padding: 1em 1.5em;

  .header {
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    align-items: center;
    border-bottom: $--border-base;
    padding-bottom: .5em;
    margin: 0 0 .5em;
    font-size: 1.5rem;

    &__section-label {
      margin: 0;
      font-size: 1.5rem;
    }

  }

  .el-main{
    padding: 0;
  }

  .btn-wrapper__heading {
    line-height: initial;
    font-size: 0.9em;
    padding: 0 0 10px 0;
    margin: 0;
  }

  .btn-wrapper__description {
    color: #444;
    display: inline-block;
    font-size: .8em;
    margin-top: .2em;
    line-height: 2em;
  }

  .sync__footer {
    text-align: center;
  }
}
</style>
