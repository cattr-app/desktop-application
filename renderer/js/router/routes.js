import Login from '../components/auth/Login.vue';
import User from '../components/user/User.vue';
import TaskList from '../components/user/tasks/List.vue';
import UserSettings from '../components/user/pages/Settings.vue';
import Info from '../components/user/tasks/Info.vue';

export default [
  {
    name: 'auth.login',
    path: '/auth/login',
    component: Login
  },
  {
    name: 'user',
    path: '/user',
    component: User,
    beforeEnter: (to, from, next) => next(), // TODO
    children: [
      {
        name: 'user.settings',
        path: 'settings',
        component: UserSettings
      },
      {
        name: 'user.tasks',
        path: 'tasks',
        component: TaskList
      },
      {
        name: 'user.task',
        path: 'task/:id',
        component: Info
      }
    ]
  }
];
