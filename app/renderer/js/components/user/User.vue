<template>
  <div class="app-container">
    <el-header class="app-controls">
      <control-bar />
      <!--<navigation class="nav-menu"></navigation>-->
    </el-header>
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
import Navigation from './Navigation';
import ControlBar from './ControlBar';
import Tracker from './tasks/Tracker';
import InactivityDialog from '../inactivity/Modal';

export default {
  name: 'User',
  components: {
    Navigation,
    ControlBar,
    Tracker,
    InactivityDialog,
  },
  data() {

    return {

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

  mounted() {

    this.$ipc.serve('tracking/event-started', req => {

      this.$store.dispatch('setTrackingTask', req.packet.body.task);

    });

    this.$ipc.serve('tracking/event-tick', req => {

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

</style>
