const EventEmitter = require('events');
const api = require('../base/api');
const {models} = require('../models').db;
const storage = require('../models');
const projectController = require('./projects');
const auth = require('../base/authentication');
const Log = require('../utils/log');
const OfflineMode = require('../base/offline-mode');
const {UIError} = require('../utils/errors');

const log = new Log('Controller:Tasks');
const taskEmitter = new EventEmitter();

/**
 * How many last tasks should be highlighted
 * @type {Number}
 */
const HIGHLIGHT_LAST_X_TASKS = 10;

/* eslint no-warning-comments: 0 */

/**
 * Formats tasks for local storage
 * @param   {Object}  tasks            Object of tasks objects received from server
 * @return  {Array}   formattedTasks   Array of formatted tasks
 */
const formatTasks = tasks => tasks.map(task => ({

  externalId: task.id,
  projectId: task.project_id,
  name: task.task_name,
  description: task.description,
  externalUrl: task.url,
  priority: task.priority_id,
  status: task.active != undefined ? task.active : task.status_id,
  updatedAt: task.updated_at,

}));

/**
 * Getting today's midnight
 * @return {Date} Today's midnight
 */
const today = () => (new Date()).setHours(0, 0, 0, 0);

/**
 * Builds query for task request
 * @param  {Boolean} [onlyActive = true] Return only active tasks
 * @return {Object}  Sequelize options
 */
const buildTaskFetchOptions = (onlyActive = true) => {

  const conditions = {

    // Include related project, and today's track if it's exists
    include: [
      {model: models.Track, required: false, where: storage.db.sequelize.and({day: today()})},
      {model: models.Project},
    ],

  };

  // Select only active projects if it's requested
  if (onlyActive)
    conditions.where = {status: '1'};

  return conditions;

};


/**
 * Rebuilds mapping between tasks and projects
 * @return {Promise<Boolean|Error>} Returns True if succeed, error otherwise
 */
const rebuildProjectsRelations = async () => {

  log.debug('Task-to-project relations remapping started');

  // Get all projects, then build Map<externalId, internalId> from them
  const indexedProjectId = (await models.Project.findAll())
    .reduce((map, p) => map.set(p.externalId, p.id), (new Map()));

  // Get all tasks, then prepare data array for bulk update
  const tasks = (await models.Task.findAll())

    .map(task => {

      // Trying to get assigned project
      const assignedProjectId = indexedProjectId.get(String(task.projectId));
      if (!assignedProjectId)
        return undefined;

      return {id: task.id, projectId: assignedProjectId};

    })

    .filter(t => typeof t !== 'undefined');

  // Use bulkCreate as something like bulkUpdate
  await models.Task.bulkCreate(tasks, {updateOnDuplicate: ['projectId']});

  // Commit all changes
  log.debug('Task-to-Projects mappings successfully updated');
  return true;

};


/**
 * Returns amount of time tracked today to this task
 * @param  {String}               taskId  Identifier of requested task
 * @return {Promise<Number|Error>}        Amount of seconds tracked
 */
module.exports.getTaskTodayTime = async taskId => {

  // Prepare correct relations conditions
  const relations = buildTaskFetchOptions();

  // Query task w/ realted entries
  if (typeof relations.where !== 'object')
    relations.where = {};
  relations.where.id = taskId;
  const task = await models.Task.findOne(relations);

  // Return null if task is not exists
  if (!task)
    return null;

  // Link spent time
  if (typeof task.Tracks[0] === 'undefined')
    return 0;
  return task.Tracks[0].overallTime;

};

/**
 * Returning task list from database
 * @param  {Boolean}                           [highlight=false]  Should we set "highlight" flag for latest tasks?
 * @param  {Boolean}                           [onlyActive=true]  Should we return only active tasks?
 * @return {Promise<Model<any, any>[]>|Error}                     Returns array of projects if succeed
 */
module.exports.getTasksList = async (highlight = false, onlyActive = true) => {

  // Just return tasks from database if highlighting is not requested
  if (!highlight)
    return models.Task.findAll(buildTaskFetchOptions(onlyActive));

  // Get tasks
  const tasks = await models.Task.findAll(buildTaskFetchOptions(onlyActive));

  // Get last X tracks from now
  let tracks = await models.Track.findAll({

    // Limit amount of tracks
    limit: HIGHLIGHT_LAST_X_TASKS,

    // Sorting
    order: [['updatedAt', 'DESC']],

  });

  // Return empty hightlights if no tracks selected
  if (tracks.length === 0) {

    taskEmitter.emit('pulled', tasks);
    return {tasks, highlights: []};

  }

  // Extract neccessary taskId and reduce everything else, but keep the order
  tracks = tracks.map(track => String(track.dataValues.taskId));

  // Reduce duplicating entries
  tracks = tracks.reduce((buffer, track) => {

    // Do nothing if this track already exists in buffer
    if (buffer.includes(track))
      return buffer;

    // Push this track into buffer
    buffer.push(track);
    return buffer;

  }, []);

  taskEmitter.emit('pulled', tasks);
  return {tasks, highlights: tracks};

};


/**
 * Sync local DB with remote storage
 * @param  {Boolean}                         [fetch=true]       Should we return tasks?
 * @param  {Boolean}                         [highlight=false]  Should we set "highlight" flag for latest tasks?
 * @param  {Boolean}                         [onlyActive=true]  Should we ask server to return only active tasks?
 * @param {Object[]} offlineTasks
 * @return {Promise<Array<Object>>|Boolean>}                    Synced tasks list (or boolean, if fetch=false)
 */
module.exports.syncTasks = async (
  fetch = true,
  highlight = false,
  onlyActive = true,
  offlineTasks = null
) => {

  // Check offline mode status
  if (OfflineMode.enabled && offlineTasks == null) {

    log.warning('Intercepting tasks sync request due to offline mode');
    return module.exports.getTasksList(highlight, onlyActive);

  }

  // Will be use that, when API will be fixed to receive IDs
  const currentUser = await auth.getCurrentUser();
  const taskOptions = {where: {'users.id': ['=', [currentUser.id]]}};
  if (onlyActive)
    taskOptions.where.active = 1;

  let actualTasks = null;

  try {

    if (offlineTasks == null) {
      actualTasks = await api.tasks.list(taskOptions);
      OfflineMode.restoreWithCheck();
    } else {
      actualTasks = offlineTasks;
    }

  } catch (err) {

    if (err instanceof api.NetworkError) {

      log.warning('Connectivity error detected, triggering offline mode');
      OfflineMode.trigger();

    } else if (err instanceof api.ApiError) {
      log.warning('ApiError error detected, triggering offline mode');
      OfflineMode.trigger();
    }

    log.warning(`Intercepting tasks listing fetch, due to error: ${err}`);
    return module.exports.getTasksList(highlight, onlyActive);

  }

  const actualTasksFormatted = formatTasks(actualTasks);

  const toUpdate = {};
  const toCreate = [];
  const toDelete = [];

  const localTasksNumber = await models.Task.count();
  const localTasks = await models.Task.findAll();

  // Nothing in the local database
  if (localTasksNumber === 0) {

    await models.Task.bulkCreate(actualTasksFormatted);
    await rebuildProjectsRelations();

    if (fetch)
      return module.exports.getTasksList(highlight);
    return true;

  }

  actualTasksFormatted.forEach(actualTask => {

    // Flag for occurencies detection
    let found = false;

    localTasks.forEach(localTask => {

      // Skipping iteration, if ocurrency already foundf
      if (found)
        return;

      // Skipping iteration, if local and remote task identifier are not in match
      if (localTask.externalId !== actualTask.externalId.toString())
        return;

      // Compare dates of last change
      if (Date.parse(localTask.updatedAt) < Date.parse(actualTask.updatedAt))
        toUpdate[actualTask.externalId] = actualTask;

      // Set flag
      found = true;

    });

    // If there are no occurencies in local database, create new one
    if (!found)
      toCreate.push(actualTask);

  });

  const actualTasksFormattedIDs = actualTasksFormatted.map(ptask => ptask.externalId);

  localTasks.forEach(ptask => {

    if (!actualTasksFormattedIDs.includes(parseInt(ptask.externalId, 10)))
      toDelete.push(ptask.externalId);

  });

  // Creating new tasks
  if (toCreate.length > 0)
    await models.Task.bulkCreate(toCreate);

  // Removing deleted tasks
  if (toDelete.length > 0)
    await models.Task.destroy({where: {externalId: toDelete}});

  // Return database content, if there are nothing to update
  if (Object.keys(toUpdate).length === 0) {

    await rebuildProjectsRelations();
    if (fetch)
      return module.exports.getTasksList();

    return true;

  }

  // Creating something like transaction, but much more weird
  const results = Object
    .values(toUpdate)
    .map(task => models.Task.update(task, {where: {externalId: task.externalId}}));

  // Run transaction
  await Promise.all(results);

  // Fix mappings
  await rebuildProjectsRelations();

  // Return all tasks from database
  if (fetch)
    return module.exports.getTasksList(highlight);
  return true;

};

/**
 * Add task to a pinned list so they would be able appear on top of other ones
 * @param {String} taskId task's ID
 * @param {Number} pinOrder Where should it be placed in pinned list
 */
module.exports.taskPinner = async (taskId, pinOrder = 0) => {

  try {

    const task = await models.Task.findByPk(taskId);
    task.pinOrder = task.pinOrder !== null ? null : pinOrder;
    await task.save();

  } catch (err) {

    throw new UIError(500, 'Cannot pin task', 'ETSK500', err);

  }

};

module.exports.updatePinOrder = async (taskId, pinOrder) => {


  try {

    const task = await models.Task.findByPk(taskId);
    task.pinOrder = pinOrder;
    await task.save();

  } catch (error) {

    throw new UIError(510, 'Cannot change task pin order', 'ETSK510', error);

  }

};

module.exports.createTask = async task => {

  const {name, projectId, description} = task;
  const project = await projectController.getProjectByInternalId(projectId[0]);
  const projectExternalId = project.externalId;
  const user = await auth.getCurrentUser();

  const taskToCreate = {
    project_id: projectExternalId,
    task_name: name,
    active: 1,
    users: [user.id, user.id],
    priority_id: 1,
  };

  // Avoid strange validation error when description is null or empty
  if (description && description.length > 0)
    taskToCreate.description = description;

  try {

    // Request the task creation, then format this task into unified model
    const {res: createdTask} = await api.tasks.create(taskToCreate);

    if (!project)
      throw new UIError(500, 'Selected project is not found', 'ETSK450');

    // Save shiny new task into database
    const savedTask = new models.Task({
      externalId: createdTask.id,
      externalUrl: createdTask.url,
      externalStatus: createdTask.active,
      name: createdTask.task_name,
      description: createdTask.description,
      priority: createdTask.priority_id,
      status: createdTask.active,
      projectId: project.id,
    });

    await savedTask.save();
    return savedTask;

  } catch (err) {

    if (err.isNetworkError || err.isApiError) {

      // Not authorized for this action
      if (err.status === 403)
        throw new UIError(403, 'Task create is not allowed for this account', 'ETSK403', err);

      throw new UIError(555, 'Cannot create task due to the network or server error', 'ETSK555', err);

    }

    throw err;

  }

};

module.exports.events = taskEmitter;
