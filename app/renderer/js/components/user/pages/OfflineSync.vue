<template>
  <el-container class="sync-container">
    <div class="header">
      <h1 class="header__text">
        {{ $t('Offline Sync') }}
      </h1>
    </div>
    <el-main>
      <el-row class="section">
        <h3 class="section__heading">{{ $t("Projects and Tasks") }}</h3>
        <p class="section__heading">{{ $t("Only the latest changes will be applied.") }}</p>
        <el-upload
            class="upload-component"
            ref="tasks_file_input"
            action="#"
            :auto-upload="false"
            :on-change="handleChange"
            :on-remove="handleRemove"
            :file-list="fileList"
            accept=".cattr">
          <el-button slot="trigger" size="small" type="primary">{{ $t('Select file') }}</el-button>
          <el-button size="small" type="success" :disabled="fileList.length === 0" @click="importProjectsAndTasks">
            {{ $t('Import') }}
          </el-button>
          <div class="el-upload__tip" slot="tip">{{ $t('only .cattr files are accepted') }}</div>
        </el-upload>
      </el-row>
      <el-row class="section">
        <h3 class="section__heading">{{ $t("Intervals") }}</h3>
        <p class="section__heading">{{ $t("You've %% not synced intervals.").replaceAll('%%', notSyncedAmount) }}</p>
        <el-button
            size="small"
            type="primary"
            :disabled="notSyncedAmount === 0"
            @click="exportIntervals"
        >
          {{ $t('Export intervals') }}
        </el-button>
        <br>
        <small class="section__description">{{
            $t("Don't forget to stop tracking before exporting intervals.")
          }}</small>

      </el-row>
    </el-main>
    <div class="sync__footer">
    </div>
  </el-container>
</template>

<script>
import {pack, unpack} from "msgpackr";

export default {
  name: 'OfflineSync',
  data() {

    return {
      fileList: []
    };

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
    handleRemove(file) {
      const fileFromInput = this.$refs.tasks_file_input.$el.querySelector('input');
      if (file?.raw?.uid != null && file?.raw?.uid === fileFromInput?.files[0]?.uid) {
        fileFromInput.value = '';
        this.fileList = [];
      }
    },
    handleChange(file) {
      this.fileList = [file];
    },
    async importProjectsAndTasks() {
      this.$refs.tasks_file_input.abort()
      const file = this.$refs.tasks_file_input.$el.querySelector('input').files[0];

      if (!file.name.endsWith('.cattr')) {
        return await this.showAlert(this.$t("Wrong format"), this.$t('Import error'));
      }

      let projectsAndTasks = null;
      try {
        projectsAndTasks = unpack(Buffer.from(await file.arrayBuffer()));
      } catch (error) {
        return await this.showAlert(this.$t("Wrong format"), this.$t('Import error'));
      }

      const projectsRes = await this.$ipc.request('projects/sync', {offlineImport: projectsAndTasks});
      if (projectsRes.code !== 200) {
        return await this.triggerErrorAlert(projectsRes.body, this.$t('Import error'));
      }
      const tasksRes = await this.$ipc.request('tasks/sync', { offlineImport:  projectsAndTasks});
      if (tasksRes.code !== 200) {
          await this.triggerErrorAlert(tasksRes.body, this.$t('Import error'));
      }
      await this.$store.dispatch('syncProjects', projectsRes.body);
      await this.$store.dispatch('syncTasks', tasksRes.body);
      await this.showAlert(this.$t("Projects and tasks successfully imported"), this.$t('Import result'));
    },

    async triggerErrorAlert(error, title) {
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
      await this.showAlert(messageContainer, title)
    },
    async showAlert(message, title) {
      await this.$alert(message, title, {
        confirmButtonText: this.$t('OK'),
        callback: () => {
        },
      });
    },
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
          await this.triggerErrorAlert(error, this.$t('Intervals export error'));
        }
      } else {
        const error = res.body;
        await this.triggerErrorAlert(error, this.$t('Intervals export error'));
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

    &__text {
      margin: 0;
      font-size: 1.5rem;
    }

  }

  .el-main {
    padding: 0;
  }

  .upload-component {
    .el-upload-list {
      max-height: 25px;
    }
  }

  .section {
    margin-bottom: 1rem;
  }

  .section__heading {
    line-height: initial;
    font-size: 0.9em;
    padding: 0 0 10px 0;
    margin: 0;
  }

  .section__description {
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
