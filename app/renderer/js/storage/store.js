/* eslint no-param-reassign: 0 */

import { Loading } from 'element-ui';
import Vue from 'vue';
// eslint-disable-next-line no-unused-vars
import { stat } from 'fs';

export default {
  state: {
    task: null,
    trackingStatus: false,
    searchPattern: '',
    loader: null,
    authenticated: false,
    tasks: [],
    projects: [],
    highlights: [],
    totalTime: 0,
    trackingInterval: null,
    shouldScroll: false,
    trackLoad: false,
    noActivityTimeLeft: null,
    isOfflineModeEnabled: false,
    currentPositionY: 0,
    notSyncedAmount: 0,
    notSyncedScreenshotsAmount: 0,
    trackingFeatures: [],
  },

  getters: {
    shouldScroll: s => s.shouldScroll,
    task: s => s.task,
    authenticated: s => s.authenticated,
    trackStatus: s => s.trackingStatus,
    searchPattern: s => s.searchPattern,
    loader: s => s.loader,
    tasks: s => s.tasks,
    projects: s => s.projects,
    highlights: s => s.highlights,
    totalTime: s => s.totalTime,
    trackingInterval: s => s.trackingInterval,
    trackLoad: s => s.trackLoad,
    noActivityTimeLeft: s => s.noActivityTimeLeft,
    isOffline: s => s.isOfflineModeEnabled,
    currentPositionY: s => s.currentPositionY,
    notSyncedAmount: s => s.notSyncedAmount,
    notSyncedScreenshotsAmount: s => s.notSyncedScreenshotsAmount,
    trackingFeatures: s => s.trackingFeatures,
  },

  mutations: {

    pinTask(state, payload) {

      const onlyPinned = state.tasks.filter(t => t.pinOrder !== null);
      const pinOrders = onlyPinned.map(t => t.pinOrder);
      const maxPinOrder = Math.max.apply(null, pinOrders);
      const newPinOrder = onlyPinned.length === 0 ? 0 : maxPinOrder + 1;
      const targetIndex = state.tasks.findIndex(t => t.id === payload.id);
      state.tasks[targetIndex].pinOrder = newPinOrder;

    },

    unpinTask(state, payload) {

      const targetIndex = state.tasks.findIndex(t => t.id === payload);
      state.tasks[targetIndex].pinOrder = null;

    },

    noActivityTimeLeft(state, payload) {

      state.noActivityTimeLeft = payload;

    },

    trackLoad(state, payload) {

      state.trackLoad = payload;

    },

    shouldScroll(state, payload) {

      state.shouldScroll = payload;

    },

    setOfflineMode(state, payload) {

      state.isOfflineModeEnabled = payload;

    },

    setCurrentPositionY(state, payload) {

      state.currentPositionY = payload;

    },

    setAuthenticatedStatus(state, payload) {

      state.authenticated = payload;

    },

    track(state, payload) {

      state.trackingStatus = payload;

    },

    loader(state, payload) {

      state.loader = payload;

    },

    task(state, payload) {

      state.task = payload;

    },

    tasks(state, payload) {

      state.tasks = payload;

    },

    projects(state, payload) {

      state.projects = payload;

    },

    setSearchPattern(state, payload) {

      if (payload)
        state.searchPattern = payload;
      else
        state.searchPattern = null;

    },

    highlights(state, payload) {

      state.highlights = payload;

    },

    trackingInterval(state, payload) {

      state.trackingInterval = payload;

    },

    tick(state) {

      const task = state.tasks.find(t => t.id === state.task);
      if (!task.TrackedTime)
        task.TrackedTime = 0;

      task.TrackedTime += 1;

      state.totalTime += 1;

    },

    tickDecrement(state, payload) {

      const task = state.tasks.find(t => t.id === payload.task);

      if (task.TrackedTime != null) {
        task.TrackedTime -= payload.duration;

        if (task.TrackedTime < 0) {
          task.TrackedTime = 0;
        }
      }

      state.totalTime -= payload.duration;

      if (state.totalTime < 0) {
        state.totalTime = 0;
      }

    },

    totalTimeSync(state, payload) {

      const totalTime = payload.time.time;
      state.totalTime = totalTime;

    },

    addHighlight(state, payload) {

      state.highlights.push(payload);

    },

    notSyncedAmount(state, payload) {

      state.notSyncedAmount = payload.amount;

    },

    notSyncedScreenshotsAmount(state, payload) {

      state.notSyncedScreenshotsAmount = payload.amount;

    },

    setTrackingFeatures(state, payload) {

      state.trackingFeatures = payload;

    }
  },

  actions: {

    setTrackingFeatures(context, payload) {

      context.commit('setTrackingFeatures', payload);

    },

    setOfflineMode(context, payload) {

      context.commit('setOfflineMode', payload);

    },

    pinTask(context, payload) {

      context.commit('pinTask', payload);

    },

    unpinTask(context, payload) {

      context.commit('unpinTask', payload);

    },

    noActivityTimeLeft({ commit }, payload) {

      commit('noActivityTimeLeft', payload);

    },

    trackLoad(context, payload) {

      context.commit('trackLoad', payload);

    },

    shouldScroll(context, payload) {

      context.commit('shouldScroll', payload);

    },

    authenticate(context) {

      context.commit('setAuthenticatedStatus', true);

    },

    syncProjects(context, { projects }) {

      context.commit('projects', projects);

    },

    syncTasks(context, { tasks, highlights }) {

      // Commit highlighted tasks (with little stupid .reverse() bypass) list if ...
      if (highlights != undefined)
        context.commit('highlights', highlights.reverse());


      // Ensure that TrackedTime property exists on all tasks
      tasks = tasks.map(task => {

        if (!task.TrackedTime)
          task.TrackedTime = 0;

        return task;

      });

      context.commit('tasks', tasks);

    },

    logout({ commit }) {

      commit('setAuthenticatedStatus', false);
      commit('tasks', []);
      commit('highlights', []);

      commit('trackingStatus', false);
      commit('task', null);

    },

    showLoader(context) {

      context.commit('loader', Loading.service({ fullscreen: true }));

    },

    setCurrentPositionY(context, payload) {

      context.commit('setCurrentPositionY', payload);

    },

    hideLoader(context) {

      if (context.getters.loader !== null)
        context.getters.loader.close();

    },

    startTrack(context, { taskId, $ipc }) {

      return Promise.resolve().then(async () => {

        context.commit('trackLoad', true);
        const res = await $ipc.request('tracking/start', { taskId });
        context.commit('trackLoad', false);

        if (res.code === 501) {

          const err = new Error(res.body.reason);
          err.success = false;

          switch (res.body.reason) {

            case 'macos_no_capture_permission':
              err.error = 'To start tracking, allow Cattr to access screen capture in macOS settings, then restart the app';
              break;

            default:
              err.error = 'Tracking is restricted';
              break;

          }

          throw err;

        }

        if (res.code === 500) {

          const err = new Error();
          err.id = res.body.id;
          err.success = false;
          err.message = res.body.message;
          err.error = res.body.error;
          throw err;

        }

        return { success: true, taskId };

      });

    },

    setTrackingTask(context, payload) {

      context.commit('track', true);
      context.commit('task', payload);

      setTimeout(() => context.commit('addHighlight', payload), 250);

    },

    tick({ commit }, payload) {

      commit('tick', payload);

    },

    tickDecrement({ commit }, payload) {

      commit('tickDecrement', payload);

    },

    totalTimeSync({ commit }, payload) {

      commit('totalTimeSync', payload);

    },

    stopTrack(context, { $ipc }) {

      return Promise.resolve().then(async () => {

        context.commit('trackLoad', true);
        const res = await $ipc.request('tracking/stop', {});
        context.commit('trackLoad', false);
        if (res.code !== 200) {

          const err = new Error();
          err.id = res.body.id;
          err.success = false;
          err.message = res.body.message;
          err.error = res.body.error;
          throw err;

        }

        return { success: true };

      });

    },

    setSearchPattern(context, pattern) {

      context.commit('setSearchPattern', pattern);

    },
  },
};
