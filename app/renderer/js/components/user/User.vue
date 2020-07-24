<template>
  <div class="app-container">
    <el-header class="app-controls">
      <control-bar />
      <!--<navigation class="nav-menu"></navigation>-->
    </el-header>

    <transition name="fade">
      <div
        v-if="isOffline"
        role="alert"
        class="el-alert el-alert--error is-light"
      >
        <i class="el-alert__icon el-icon-cloudy is-big" />
        <div class="el-alert__content">
          <span class="el-alert__title is-bold">Connection lost</span>
          <p class="el-alert__description">
            Waiting for reconnection
          </p>
        </div>
      </div>
    </transition>

    <div
      ref="view"
      class="view"
    >
      <transition
        name="page"
        mode="out-in"
      >
        <router-view />
      </transition>
    </div>
    <tracker />

    <inactivity-dialog />
  </div>
</template>

<script>
import Navigation from './Navigation.vue';
import ControlBar from './ControlBar.vue';
import Tracker from './tasks/Tracker.vue';
import InactivityDialog from '../inactivity/Modal.vue';

export default {
  name: 'User',
  components: {
    Navigation,
    ControlBar,
    Tracker,
    InactivityDialog,
  },

  props: {
    isTrackerLoading: Boolean,
  },

  data() {

    return {
      isOffline: false,
    };

  },

  computed: {
    task() {

      return this.$store.getters.task;

    },
  },

  watch: {
    task() {

      this.scrollTop();

    },
    activityTimeLeft() {

      if (this.activityTimeLeft < 1)
        clearInterval(this.activity.interval);


    },
  },

  async mounted() {

    // Request actual offline status
    (async () => {

      const offlineStatus = await this.$ipc.request('offline/request-status', {});
      this.isOffline = offlineStatus.body.state;

    })();

    // Receiving offline status updates
    this.$ipc.serve('offline/status', req => {

      this.isOffline = req.packet.body.state;

    });

    this.$ipc.serve('tracking/event-started', req => {

      this.$store.dispatch('setTrackingTask', req.packet.body.task);

    });

    this.$ipc.serve('tracking/event-tick-relative', req => {

      this.$store.dispatch('tick', req.packet.body.ticks);

    });

    this.$ipc.serve('tracking/event-stopped', () => {

      this.$store.commit('track', false);

    });

    this.$ipc.serve('tracking/interval-removed', req => {

      const { interval } = req.packet.body;
      this.$store.dispatch('tickDecrement', {
        task: interval.task.id,
        duration: interval.duration,
      });

    });

  },

  methods: {
    scrollTop() {

      setTimeout(() => {

        this.$refs.view.scrollTop = 0;

      }, 100);

    },
  },
};
</script>

<style lang="scss">
  @import "../../../scss/imports/variables";

  .app-container {
    height: 100%;
    max-height: 100%;
    display: flex;
    flex-direction: column;

    .app-controls {
      height: auto !important;
      border-bottom: $--border-base;
      padding: 0;

      .nav-menu {
        li {
          height: 45px;
          display: flex;
          line-height: initial;
          align-items: center;
        }
      }
    }

    .header {
      z-index: 10;
      border-radius: 0;
    }

    .view {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      max-height: 100%;
      overflow-x: hidden;

      scroll-behavior: smooth;
    }
  }

  .page-enter-active, .page-leave-active {
    transition: opacity .3s, transform .3s;
  }

  .page-enter, .page-leave-to {
    opacity: 0;
    transform: translateX(-30%);
  }

  .el-alert {
    border-radius: 0;
  }

  .el-alert__icon {
    -webkit-animation: flickerAnimation 1.5s infinite;
    -moz-animation: flickerAnimation 1.5s infinite;
    -o-animation: flickerAnimation 1.5s infinite;
    animation: flickerAnimation 1.5s infinite;
  }

  @keyframes flickerAnimation {
    0%   { opacity:1; }
    50%  { opacity:0; }
    100% { opacity:1; }
  }

  @-o-keyframes flickerAnimation{
    0%   { opacity:1; }
    50%  { opacity:0; }
    100% { opacity:1; }
  }

  @-moz-keyframes flickerAnimation{
    0%   { opacity:1; }
    50%  { opacity:0; }
    100% { opacity:1; }
  }

  @-webkit-keyframes flickerAnimation{
    0%   { opacity:1; }
    50%  { opacity:0; }
    100% { opacity:1; }
  }

  .fade-enter-active, .fade-leave-active {
    transition: opacity 1.5s;
  }

  .fade-enter, .fade-leave-to /* .fade-leave-active до версии 2.1.8 */ {
    opacity: 0;
  }

</style>
