<template>
  <div class="login-container">
    <h1>Cattr</h1>
    <el-card
      ref="card"
      class="box-card login"
    >
      <div
        slot="header"
        class="clearfix"
      >
        <el-steps
          :active="step"
          finish-status="success"
          align-center=""
        >
          <el-step :title="$t('Hostname')" />
          <el-step :title="$t('Credentials')" />
        </el-steps>
      </div>
      <div class="form">
        <el-form
          v-if="step === 1"
          ref="hostname"
          :rules="validationRules"
          label-position="top"
          :model="formData"
          @submit.prevent.native="validateWindow"
        >
          <el-form-item
            prop="hostname"
            class="form-item"
            :label="$t('Hostname')"
          >
            <el-input
              v-model="formData.hostname"
              type="text"
            />
          </el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            native-type="submit"
            @click="validateWindow"
          >
            {{ $t('Continue') }}
          </el-button>
        </el-form>
        <el-form
          v-if="step === 2"
          ref="login"
          :rules="validationRules"
          :model="formData"
          @submit.prevent.native="validateWindow"
        >
          <el-form-item
            prop="login"
            :label="$t('E-Mail')"
            class="form-item"
          >
            <el-input
              v-model="formData.login"
              type="text"
            />
          </el-form-item>
          <el-form-item
            prop="password"
            class="form-item"
            :label="$t('Password')"
          >
            <el-input
              v-model="formData.password"
              type="password"
            />
          </el-form-item>
          <el-button
            type="secondary"
            @click="back"
          >
            {{ $t('Back') }}
          </el-button>
          <el-button
            type="primary"
            :loading="loading"
            native-type="submit"
            @click="validateWindow"
          >
            {{ $t('Sign In') }}
          </el-button>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'Login',

  data() {

    return {
      formData: {
        hostname: null,
        login: null,
        password: null,
      },
      step: 1,
      valid: true,

      hostnameValid: true,
      hostnameError: '',

      breakLoading: false,

      loading: false,

      validationRules: {
        hostname: [
          {
            required: true,
            message: this.$t('Hostname (e.g. "time.acme.corp") is required'),
            trigger: 'blur',
          },
        ],
        login: [
          {
            required: true,
            message: this.$t('Email is required'),
            trigger: 'blur',
          },
        ],
        password: [
          {
            required: true,
            message: this.$t('Password is required'),
            trigger: 'blur',
          },
        ],
      },
    };

  },

  computed: {
    currentTitle() {

      switch (this.step) {

        case 1:
          return this.$t('Hostname');
        case 2:
          return this.$t('Authorization');
        default:
          return this.$t('Account created');

      }

    },
  },

  async mounted() {

    // Subscribe for the detected SSO URLs
    this.$ipc.serve('auth/sso-detected', request => {

      // Execute only on Login component
      if (this.$route.name === 'auth.login')
        this.promptForSSO(request.packet.body);

    });

    // Request for SSO data
    const ssoParamsRequest = await this.$ipc.request('auth/check-sso-presence', {});
    if (ssoParamsRequest.code === 200)
      this.promptForSSO(ssoParamsRequest.body);

  },

  methods: {

    async promptForSSO(ssoParams) {

      const url = new URL(ssoParams.baseUrl);

      this
        .$confirm(this.$t('Are you sure you want to sign in to').concat(`: ${url.origin}?`), this.$t('Single Sign-On'), {
          confirmButtonText: this.$t('Yes'),
          cancelButtonText: this.$t('Cancel'),
          type: 'info',
        })

        // SSO confirmed, trying to sign in
        .then(async () => {

          this.$store.dispatch('showLoader');
          const authRequest = await this.$ipc.request('auth/perform-sso', ssoParams);

          // Success
          if (authRequest.code === 200) {

            await this.$ipc.request('projects/sync', {});
            const tasks = await this.$ipc.request('tasks/sync', {});
            this.$store.dispatch('syncTasks', tasks.body);
            const totalTime = await this.$ipc.request('time/total', {});
            this.$store.dispatch('totalTimeSync', totalTime.body);
            this.$router.push({ name: 'user.tasks' });
            this.$store.dispatch('hideLoader');
            return true;

          }

          // Show error on failure
          this.$store.dispatch('hideLoader');
          this.$message.error(this.$t(authRequest.body.message));
          return false;

        })

        // Catch user "dialog discard" action
        .catch(() => {});

    },

    async onSubmit() {

      const ipcRoute = 'auth/authenticate';
      this.$store.dispatch('showLoader');
      const auth = await this.$ipc.request(ipcRoute, {
        username: this.formData.login,
        password: this.formData.password,
      });

      if (auth.code === 200) {

        await this.$store.dispatch('authenticate');
        await this.$ipc.request('projects/sync', {});
        const tasks = await this.$ipc.request('tasks/sync', {});
        this.$store.dispatch('syncTasks', tasks.body);
        const totalTime = await this.$ipc.request('time/total', {});
        this.$store.dispatch('totalTimeSync', totalTime.body);
        this.$router.push({ name: 'user.tasks' });
        await this.$ipc.request('offline-sync/get-public-key', {});

      } else {

        const error = auth.body;

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
        this.$alert(messageContainer, this.$t('Login failed'), {
          confirmButtonText: this.$t('OK'),
          callback: () => {},
        });

      }
      this.$store.dispatch('hideLoader');

    },

    back() {

      this.step = 1;

    },

    validateWindow(event) {

      if (this.step === 1) {

        this.$refs.hostname.validate(async valid => {

          this.loading = true;
          if (valid) {

            const res = await this.checkHostname();
            if (res) {

              this.formData.login = '';
              this.formData.password = '';
              this.nextStep();

            }

          }
          this.loading = false;

        });

      } else if (this.step === 2) {

        this.$refs.login.validate(valid => {

          if (valid) {

            this.nextStep();
            event.preventDefault();

          } else
            return false;

        });

      }

    },

    async checkHostname() {

      this.loading = true;
      const ipcRoute = 'auth/check-hostname';
      const res = await this.$ipc.request(ipcRoute, { hostname: this.formData.hostname });

      if (res.code === 200) {

        this.loading = false;
        return true;

      }
      const error = res.body;

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
      this.$alert(messageContainer, this.$t('Login failed'), {
        confirmButtonText: this.$t('OK'),
        callback: () => {},
      });
      this.loading = false;
      return false;

    },

    nextStep() {

      if (this.step < 2)
        this.step += 1;
      else
        this.onSubmit();

    },
  },
};
</script>

<style lang="scss">
    @import "../../../scss/imports/variables";

    .login-container {
        display: flex;
        height: 100vh;
        flex-direction: column;
        justify-content: center;
        align-items: center;

        .login {
            width: 70%;
            display: flex;
            flex-direction: column;
            transition: 0.5s cubic-bezier(0.25, 0.8, 0.5, 1);

            .form {
                flex: 1;
                transition: flex .3s ease;

                .form-item {
                    label {
                        line-height: initial;
                        font-size: .9em;
                        margin-bottom: .5em;
                        padding: 0;
                    }

                    .el-form-item__content {
                        .el-select {
                            width: 100%;
                        }
                    }
                }
            }
        }

    }

    .expand-enter-active,
    .expand-leave-active {
        transition: height 1s ease-in-out;
        overflow: hidden;
    }

    .expand-enter,
    .expand-leave-to {
        height: 0;
    }
</style>
