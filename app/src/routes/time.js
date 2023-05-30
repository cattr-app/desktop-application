const Logger = require('../utils/log');
const Time = require('../controller/time');
const { UIError } = require('../utils/errors');
const auth = require('../base/authentication');
const { db } = require('../models');
const OfflineMode = require('../base/offline-mode');
const TaskTracker = require('../base/task-tracker');

const log = new Logger('Router:Time');
log.debug('Loaded');

module.exports = router => {

  // Get overall time from server
  router.serve('time/total', async request => {

    try {

      let totalTimeToday = null;

      if (!OfflineMode.enabled) {

        // Starting sync routine
        log.debug('Time sync initiated by renderer');
        const currentUser = await auth.getCurrentUser();
        totalTimeToday = await Time.getUserTotalTimeForToday(currentUser.id);

      } else
        totalTimeToday = await Time.getLocalTotalTimeForToday();

      // If tracker is running, add the current interval duration to total time
      if (TaskTracker.isActive)
        totalTimeToday.time += TaskTracker.ticker.ticks || 0;

      // Returning response
      log.debug('Time successfully synced');
      return await request.send(200, { time: totalTimeToday });

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        // {error: error.error} means we are passing error that initially triggered UIError
        return request.send(error.code, { message: error.message, id: error.errorId, error: error.error == null ? error.error : JSON.parse(JSON.stringify(error.error)) });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured in the time total sync route', error);
      request.send(500, { message: 'Internal error occured', id: 'ERTT500' });

      return false;

    }

  });

  // Getting projects and tasks with their's time spent
  // TODO please write the structure that's returned from here, cause it's kinda confusing
  router.serve('time/daily-report', async request => {

    // Handle offline mode case
    if (OfflineMode.enabled)
      return request.send(422, {});

    // Getting sequelize operators
    const { Op } = db.Sequelize;

    // Request tasks been active today from server
    let todayTasks = null;
    try {

      todayTasks = (await Time.getTasksTimeForToday());

    } catch (error) {

      // Catch connectivity errors and bypass all other
      if (error.request) {

        OfflineMode.trigger();
        return request.send(422, {});

      }

      throw error;

    }

    // Return special status code if daily report is empty
    if (typeof todayTasks === 'undefined')
      return request.send(204, {});

    // Extract identifiers from today tasks
    const todayTasksIDs = todayTasks.map(task => task.id);

    // Search and get theese tasks and projects they belong
    let localTodayProjects = await db.models.Project.findAll({
      include: [{
        model: db.models.Task,
        where: {
          externalId: {
            [Op.in]: todayTasksIDs,
          },
        },
      }],
    });

    const taskTimeByIds = new Map(todayTasks.map(task => [task.id, task.time]));
    // Purify projects
    localTodayProjects = localTodayProjects.map(project => {

      // Purify project tasks
      const tasks = project.dataValues.Tasks.map(task => ({
        id: task.id,
        externalId: task.externalId,
        name: task.name,
        url: task.externalUrl,
        trackedTime: taskTimeByIds.get(Number(task.externalId)),
      }));

      // Return purified project property
      return { name: project.dataValues.name, tasks };

    });

    // Dirtiest fix (I've ever seen) for tasks the user doesn't have access to
    const localTodayTasksRestQuery = await db.models.Task.findAll({

      where: {
        externalId: {
          [Op.in]: todayTasksIDs,
        },
        [Op.not]: {
          projectId: {
            [Op.substring]: '%-%',
          },
        },
      },
    });

    if (localTodayTasksRestQuery !== undefined || localTodayTasksRestQuery.length !== 0) {

      const miscTasks = localTodayTasksRestQuery.map(task => ({
        id: task.dataValues.id,
        externalId: task.dataValues.externalId,
        name: task.dataValues.name,
        url: task.dataValues.externalUrl,
        trackedTime: taskTimeByIds.get(Number(task.externalId)),
      }));

      localTodayProjects.push({ name: 'Misc', tasks: miscTasks });

    }

    // Return today tasks object
    return request.send(200, { projects: localTodayProjects });

  });

};
