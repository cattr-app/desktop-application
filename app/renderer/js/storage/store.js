/* eslint no-param-reassign: 0 */

import { Loading } from 'element-ui';
import Vue from 'vue';

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
    trackingInterval: null,
    shouldScroll: false,
    trackLoad: false,
    noActivityTimeLeft: null,
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
    trackingInterval: s => s.trackingInterval,

    trackLoad: s => s.trackLoad,

    noActivityTimeLeft: s => s.noActivityTimeLeft,
  },

  mutations: {
    noActivityTimeLeft(state, payload) {

      state.noActivityTimeLeft = payload;

    },

    trackLoad(state, payload) {

      state.trackLoad = payload;

    },

    shouldScroll(state, payload) {

      state.shouldScroll = payload;

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

    },

    tickDecrement(state, payload) {

      const task = state.tasks.find(t => t.id === payload.task);
      if (task.TrackedTime)
        task.TrackedTime -= payload.duration;

    },

    addHighlight(state, payload) {

      state.highlights.push(payload);

    },
  },

  actions: {
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

    hideLoader(context) {

      if (context.getters.loader !== null)
        context.getters.loader.close();

    },

    startTrack(context, { taskId, $ipc }) {

      return Promise.resolve().then(async () => {

        context.commit('trackLoad', true);
        const res = await $ipc.request('tracking/start', { taskId });
        context.commit('trackLoad', false);
        if (res.code === '501') {

          const err = new Error(res.body.reason);
          err.success = false;
          err.error = Vue.$t('Tracking Disabled');
          throw err;

        }

        if (res.code === '500') {

          const err = new Error('Internal Server Error');
          err.success = false;
          err.error = Vue.$t('Internal Server Error');
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

    stopTrack(context, { $ipc }) {

      return Promise.resolve().then(async () => {

        context.commit('trackLoad', true);
        const res = await $ipc.request('tracking/stop', {});
        context.commit('trackLoad', false);
        if (res.code !== 200) {

          const err = new Error('Internal Server Error');
          err.success = false;
          err.error = Vue.$t('Internal Server Error');
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
