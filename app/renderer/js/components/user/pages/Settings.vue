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
      </el-form-item>
      <el-form-item />
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
      yesno: [
        { label: 'Yes', value: true },
        { label: 'No', value: false }
      ],

      formData: {},
      formFields: [],
      values: {}
    };

  },

  async mounted() {

    this.$ipc.request('user-preferences/export-structure', {}).then(({ body }) => {

      for (const formField in body.preferences) {

        if (body.preferences.hasOwnProperty(formField)) {

          /* const field = Object.assign({}, this.formFields[formField]);
            this.$set(this.formData, formField, field.value || field.default); */
          const fd = body.preferences[formField];
          const renderableField = {
            key: formField,
            label: fd.name,
            value: (typeof fd.value !== 'undefined' && fd.value !== null) ? fd.value : fd.default,
            description: fd.description,
            frontend: {
              type: fd.frontend.element === 'toggle' || fd.frontend.element === 'options' ? 'select' : fd.frontend.element
            }
          };

          if (fd.frontend.element === 'options' || fd.frontend.element === 'select' || fd.frontend.element === 'toggle') {

            const opts = Object.entries(fd.frontend.options).map(([ key, value ]) => ({
              label: key,
              value
            }));
            renderableField.frontend.options = opts;

          } else
            renderableField.frontend.options = fd.frontend.options;


          const field = { ...renderableField };
          this.formFields.push(renderableField);
          this.$set(this.formData, formField, field.value);

        }

      }

    });

  },
  methods: {
    async logout() {

      this.loggingOutInProgress = true;
      await this.$store.dispatch('stopTrack', { $ipc: this.$ipc });
      const req = await this.$ipc.request('auth/logout', {});
      if (req.code === 200)
        this.$store.dispatch('logout', this.$ipc);
      else {

        const htmlError = `
                        <div class="error-message">
                            <div class="text">
                                <p>${this.$t('Something went wrong')}</p>
                                <code>${req.body.message}</code>
                            </div>
                        </div>
                    `;
        this.$alert(htmlError, 'Whoops!', {
          dangerouslyUseHTMLString: true,
          confirmButtonText: `${this.$t('OK')} 😢`
        });

      }
      this.loggingOutInProgress = false;

    },
    async onSubmit() {

      this.savingInProgress = true;
      const res = await this.$ipc.request('user-preferences/set-many', {
        preferences: { ...this.formData }
      });

      this.savingInProgress = false;

      if (res.code === 200) {

        if ('language' in this.formData)
          this.$i18n.locale = this.formData.language;

        this.$alert(this.$t('Settings saved successfully!'), 'Woohoo!', {
          confirmButtonText: 'Yay!'
        });

      } else {

        this.$alert(res.body.message, this.$t('Whoops!'), {
          confirmButtonText: this.$t('OK')
        });

      }

    }
  }
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
      }
    }


    .settings__footer {
      text-align: center;
    }
  }
</style>