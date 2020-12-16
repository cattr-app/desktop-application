import Router from 'vue-router';
import Vue from 'vue';
import routes from './routes';

Vue.use(Router);

export default new Router({
  mode: 'history',
  routes,
});
