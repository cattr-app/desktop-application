const Logger = require('../utils/log');
const Tasks = require('../controller/tasks');
const { UIError } = require('../utils/errors');
const Time = require('../controller/time');
const UserPreferences = require('../base/user-preferences');

const log = new Logger('Router:Tasks');
log.debug('Loaded');

/**
 * Truncates all uneccessery fields from Sequelize objects
 * @param  {Array<Model>}   instances  Instances with Sequelize fields
 * @return {Array<Objects>}            Instances with only data values
 */
const purifyInstances = instances => instances.map(instance => {

  // This instance properties
  const returnObject = Object.assign(instance.dataValues);

  // Related project properties
  if (instance.dataValues.Project)
    returnObject.Project = Object.assign(instance.dataValues.Project.dataValues);

  // Related tracks
  if (instance.dataValues.Tracks && instance.dataValues.Tracks.length > 0)
    returnObject.Tracks = instance.dataValues.Tracks.map(track => Object(track.dataValues));

  // Related time tracked into this task (we use [0] index because every time we ask for
  // related track we filter it for only today date on the upper layer, so recieve an array
  // length == 1)
  if (instance.dataValues.Tracks && instance.dataValues.Tracks.length > 0)
    returnObject.TrackedTime = Number(instance.dataValues.Tracks[0].overallTime);

  // Return purified model
  return returnObject;

});

module.exports = router => {

  router.serve('tasks/create', async request => {

    const task = request.packet.body;

    try {

      // Starting sync routine
      log.debug('Task creation initiated from frontend');
      const createdTask = await Tasks.createTask(task);
      return request.send(200, { task: createdTask });

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        return request.send(error.code, { message: error.message, id: error.errorId });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured during the task creation', error);
      request.send(500, { message: 'Internal error occured', id: 'ERTT500' });

      return false;

    }

  });

  // Sync tasks from server
  router.serve('tasks/sync', async request => {

    try {

      // Starting sync routine
      log.debug('Tasks sync initiated by renderer');

      await Tasks.syncTasks(false, false, !UserPreferences.get('showInactiveTasks'));
      await Time.syncTasksTime();
      let { tasks, highlights } = await Tasks.getTasksList(true, !UserPreferences.get('showInactiveTasks'));

      // Purify sequelize output
      tasks = purifyInstances(tasks);
      highlights = highlights.map(String);

      // Returning response
      log.debug('Tasks successfully synced');
      return request.send(200, { tasks, highlights });

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        return request.send(error.code, { message: error.message, id: error.errorId });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured during the task sync', error);
      request.send(500, { message: 'Internal error occured', id: 'ERTT500' });

      return false;

    }

  });

  // Returns list of tasks from local database
  router.serve('tasks/list', async request => {

    try {

      // Starting sync routine
      log.debug('Local tasks fetch initiated by renderer');
      let { tasks, highlights } = await Tasks.getTasksList(true, !UserPreferences.get('showInactiveTasks'));

      // Purify sequelize output
      tasks = purifyInstances(tasks);
      highlights = highlights.map(String);

      // Returning response
      log.debug('Tasks successfully fetched from local databasse');
      return request.send(200, { tasks, highlights });

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        return request.send(error.code, { message: error.message, id: error.errorId });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured during the task sync', error);
      request.send(500, { message: 'Internal error occured', id: 'ERTT501' });

      return false;

    }

  });

  router.serve('tasks/pinner', async request => {

    const { id, pinOrder } = request.packet.body;
    await Tasks.taskPinner(id, pinOrder);

  });

  router.serve('tasks/pinOrder/update', async request => {

    const { id, pinOrder } = request.packet.body;
    await Tasks.updatePinOrder(id, pinOrder);

  });

};
