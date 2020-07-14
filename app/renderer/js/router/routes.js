import Login from '../components/auth/Login.vue';
import User from '../components/user/User.vue';
import UserTasks from '../components/user/pages/UserTasks.vue';
import UserSettings from '../components/user/pages/Settings.vue';
import Info from '../components/user/tasks/Info.vue';
import TaskCreate from '../components/user/tasks/Create.vue';
import Project from '../components/user/pages/Project.vue';

export default [
  {
    name: 'auth.login',
    path: '/auth/login',
    component: Login,
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
        component: UserSettings,
      },
      {
        name: 'user.tasks',
        path: 'tasks',
        component: UserTasks,
      },
      {
        name: 'user.task',
        path: 'task/:id',
        component: Info,
      },
      {
        name: 'user.project',
        path: 'project/:id',
        component: Project,
      },
      {
        name: 'user.createTask',
        path: 'create',
        component: TaskCreate,
      },
    ],
  },
];
