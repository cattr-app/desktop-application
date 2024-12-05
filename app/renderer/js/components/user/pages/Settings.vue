<template>
  <el-container class="settings-container">
    <div class="header">
      <h1 class="header__section-label">
        {{ $t('User Settings') }}
      </h1>
    </div>
    <el-form
      ref="settings"
      class="settings-form"
      label-position="top"
    >
      <el-form-item
        v-for="formField in formFields"
        :key="formField.key"
        class="form-item"
        :label="$t(formField.label)"
        label-position="top"
      >
        <template v-if="formField.frontend.type === 'number' || formField.frontend.type === 'text'">
          <el-input
            v-model="formData[formField.key]"
            :type="formField.frontend.type"
            v-bind="{'min': formField.frontend.options.min, 'max': formField.frontend.options.max}"
            :placeholder="$t(formField.description)"
          />
        </template>
        <template v-if="formField.frontend.type === 'select'">
          <el-select
            v-model="formData[formField.key]"
            :placeholder="$t(formField.description)"
          >
            <el-option
              v-for="(option, i) in formField.frontend.options"
              :key="i"
              :label="$t(option.label)"
              :value="option.value"
            />
          </el-select>
        </template>
        <small class="el-form-item-comment">{{ $t(formField.description) }}</small>
      </el-form-item>
    </el-form>
    <div class="settings__footer">
      <el-button
        :loading="savingInProgress"
        type="primary"
        @click="onSubmit"
      >
        {{ $t('Save') }}
      </el-button>
      <el-button
        :loading="loggingOutInProgress"
        type="secondary"
        @click="logout"
      >
        {{ $t('Logout') }}
      </el-button>
      <br>
      <br>
      <el-button
        :loading="ssoLoading"
        type="secondary"
        @click="performSSO"
      >
        {{ $t('Sign into web app') }}
      </el-button>
      <br><br>
      <small style="color: #999">
        Cattr {{ version.number }} 💖 
        <br>
        {{ version.devMode ? '+dev ' : '' }}
        {{ version.sentry ? '+sentry' : '' }}
      </small>
    </div>
  </el-container>
</template>

<script>
export default {
  name: 'Settings',
  data() {

    return {
      loggingOutInProgress: false,
      savingInProgress: false,
      ssoLoading: false,
      yesno: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],

      formData: {},
      formFields: [],
      values: {},
      version: {}
    };

  },

  async mounted() {

    this.$ipc.request('user-preferences/export-structure', {}).then(({ body }) => {

      this.version = body.version;
      Object.entries(body.preferences).forEach(([prefKey, prefVal]) => {

        const renderableField = {
          key: prefKey,
          label: prefVal.name,
          value: (typeof prefVal.value !== 'undefined' && prefVal.value !== null) ? prefVal.value : prefVal.default,
          description: prefVal.description,
          frontend: {
            type: (['toggle', 'options'].includes(prefVal.frontend.element)) ? 'select' : prefVal.frontend.element,
          },
        };

        if (['options', 'select', 'toggle'].includes(prefVal.frontend.element)) {

          const opts = Object
            .entries(prefVal.frontend.options)
            .map(([key, value]) => ({ label: key, value }));

          renderableField.frontend.options = opts;

        } else
          renderableField.frontend.options = prefVal.frontend.options;


        const field = { ...renderableField };
        this.formFields.push(renderableField);
        this.$set(this.formData, prefKey, field.value);

      });

    });

  },
  methods: {

    /**
     * Handles "sign in webapp" button action
     * @async
     */
    async performSSO() {

      // Set visual loading status
      this.ssoLoading = true;

      // Fetch URL from remote
      const req = await this.$ipc.request('auth/request-single-click-redirection', {});

      // Display error if URL request is failed
      if (req.code !== 200)

        // Show error and unset the loading flag
        this.$message({ type: 'error', message: `${this.$t('Error')}: ${req.body.message}` });

      else

        // Show success message
        this.$message({ type: 'success', message: this.$t('Success! Opening your browser...') });

      // Unset loading state
      this.ssoLoading = false;

    },

    async logout() {

      this.loggingOutInProgress = true;
      this.$store
          .dispatch('stopTrack', { $ipc: this.$ipc })
          .catch(error => {
            const h = this.$createElement;
            const messageContainer = h('div', null, [
              h('p', null, error.message || 'Unknown error occured')
            ]);

            if (error.error?.isApiError && error.error.trace_id) {
              messageContainer.children.push(
                  h('p', null, [
                    h('b', null, 'Backend traceId'),
                    h('span', null, `: ${error.error.trace_id}`)
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
                `${this.$t('Tracking error')} ${error.id || ''}`,
                {
                  confirmButtonText: 'OK', callback: () => {
                  }
                },
            );

          });
      const req = await this.$ipc.request('auth/logout', {});
      if (req.code === 200)
        this.$store.dispatch('logout', this.$ipc);
      else {

        const error = req.body;

        const h = this.$createElement;
        const messageContainer = h("div", null, [
          h("p", null, error.message ? this.$t(error.message) : "Unknown error occured"),
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
        this.$alert(messageContainer, this.$t('Logout error'), {
          confirmButtonText: this.$t('OK'),
          callback: () => {},
        });

      }
      this.loggingOutInProgress = false;

    },
    async onSubmit() {

      this.savingInProgress = true;
      const res = await this.$ipc.request('user-preferences/set-many', {
        preferences: { ...this.formData },
      });

      this.savingInProgress = false;

      if (res.code === 200) {

        if ('language' in this.formData)
          this.$i18n.locale = this.formData.language;

        this.$alert(
          this.$t('Settings saved successfully!'),
          this.$t('Settings'),
          {
            confirmButtonText: this.$t('Awesome!'),
            callback: () => {},
          },
        );

      } else {

        this.$alert(
          res.body.message,
          this.$t('Settings error'),
          {
            confirmButtonText: this.$t('OK'),
            callback: () => {},
          },
        );

      }

    },
  },
};
</script>

<style lang="scss">
  @import "../../../../scss/imports/variables";


  .settings-container {
    flex-direction: column;
    padding: 1em 1.5em;

    .account-section {
      display: flex;
      flex-direction: column;
      padding-bottom: 1em;

      .account-data {
        display: flex;
        flex-flow: row;
      }
    }

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

      &.header-fixed {
        position: fixed;
        background: rgba(255, 255, 255, 0.3);
        width: 100%;
      }

    }


    .settings-form {
      .form-item {
        label {
          line-height: initial;
          font-size: .9em;
        }

        .el-form-item__content {
          .el-select {
            width: 100%;
          }
        }

        .el-form-item-comment {
          color: #444;
          display: inline-block;
          font-size: .8em;
          margin-top: .9em;
          line-height: 2em;
        }
      }
    }


    .settings__footer {
      text-align: center;
    }
  }
</style>
