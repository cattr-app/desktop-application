/* eslint camelcase: 0 */
/* eslint no-warning-comments: 0 */

const api = require('../base/api');
const database = require('../models').db.models;
const sequelize = require('../models').db.sequelize;
const Log = require('../utils/log');
const OfflineMode = require('../base/offline-mode');
const {Op} = require("sequelize");

const log = new Log('Controller:Time-Intervals');

/**
 * Number of synced intervals we keep in database queue
 * @type {Number}
 */
const NUMBER_OF_SYNCED_INTERVALS_TO_KEEP = 5;

/**
 * Remove a single old interval from queue
 * @async
 */
module.exports.reduceSyncedIntervalQueue = async () => {

  // Get number of synced intervals in queue
  const intervalsInQueue = await database.Interval.count({ where: { synced: true } });

  // Remove the first interval in the queue
  if (intervalsInQueue >= NUMBER_OF_SYNCED_INTERVALS_TO_KEEP) {

    await database.Interval.destroy({
      where: { synced: true },
      order: [['createdAt', 'ASC']],
      limit: 1,
    });

  }

};

/**
 * Returns all intervals in both latest pushed & unsynced queues
 * @async
 * @returns {Promise.<Interval[]>}
 */
module.exports.fetchIntervalsQueue = async () => database.Interval.findAll({ include: database.Task });

/**
 * Returns amount of not synced intervals
 * @async
 * @returns {Promise.<integer>}
 */
module.exports.fetchNotSyncedIntervalsAmount = async () => database.Interval.count({ where: { synced: false } });

/**
 * Returns amount of not synced screenshots
 * @async
 * @returns {Promise.<integer>}
 */
module.exports.fetchNotSyncedScreenshotsAmount = async () => database.Interval.count({
  where: {
    synced: false,
    screenshot: {
      [Op.not]: null,
    }
  }
});


/**
 * Returns not synced intervals
 * @async
 * @returns {Promise.<Interval[]>}
 */
module.exports.fetchNotSyncedIntervals = async () => database.Interval.findAll({
  where: { synced: false } ,
  attributes: [
    ['id', 'screenshot_id'],
    ['taskId', 'task_id'],
    ['userId', 'user_id'],
    ['startAt', 'start_at'],
    ['endAt', 'end_at'],
    ['systemActivity', 'activity_fill'],
    ['mouseActivity', 'mouse_fill'],
    ['keyboardActivity', 'keyboard_fill'],
    [sequelize.literal(`(CASE WHEN screenshot is NULL THEN NULL ELSE 1 END)`), 'has_screenshot']
  ]
});

/**
 * Returns not synced screenshots
 * @async
 * @returns {Promise.<Interval[]>}
 */
module.exports.fetchNotSyncedScreenshots = async () => database.Interval.findAll({
  where: {
    synced: false,
    screenshot: {
      [Op.not]: null,
    },
  },
  attributes: [
    ['id', 'screenshot_id'],
    ['userId', 'user_id'],
    ['screenshot', 'screenshot']
  ]
});

/**
 * Puts interval in the queue
 * @async
 * @param {Object} interval   Interval (API-formatted) to put into queue
 * @param {Buffer} screenshot Associated screenshot
 * @param {String} remoteId   Identifier of the interval on remote
 * @returns {Promise.<Interval>}
 */
module.exports.pushSyncedIntervalInQueue = async (interval, screenshot, remoteId) => {

  // Reduce uneccessary intervals
  await module.exports.reduceSyncedIntervalQueue();

  const formattedInterval = {
    taskId: interval.task_id,
    startAt: interval.start_at,
    endAt: interval.end_at,
    userId: interval.user_id,
    systemActivity: interval.activity_fill,
    synced: true,
    remoteId,
  };

  if (interval.keyboard_fill)
    formattedInterval.keyboardActivity = interval.keyboard_fill;

  if (interval.mouse_fill)
    formattedInterval.mouseActivity = interval.mouse_fill;

  // Attach screenshot if it is exists
  if (screenshot)
    formattedInterval.screenshot = screenshot;

  // Save & return the interval
  return database.Interval.create(formattedInterval);

};

/**
 * Backs up the interval into local database
 * @param   {Object}  interval      object representing interval
 * @param   {Buffer}  [screenshot]  binary formatted screenshot
 * @returns {Object}  interval      created interval
 */
module.exports.backupInterval = async (interval, screenshot) => {

  // Hotfix to keep consinstency between API v1 & v1-ng
  let convertedInterval = null;

  // Option 1: Backend-formatted interval
  if (typeof interval.task_id !== 'undefined') {

    convertedInterval = {
      taskId: interval.task_id,
      startAt: interval.start_at,
      endAt: interval.end_at,
      userId: interval.user_id,
      systemActivity: interval.activity_fill,
      synced: false,
    };

    if (interval.keyboard_fill)
      convertedInterval.keyboardActivity = interval.keyboard_fill;

    if (interval.mouse_fill)
      convertedInterval.mouseActivity = interval.mouse_fill;

  } else {

    // Option 2: Local-formatted interval
    convertedInterval = {
      taskId: interval.taskId,
      userId: interval.userId,
      startAt: interval.start,
      endAt: interval.end,
      synced: false,
      systemActivity: interval.systemActivity,
    };

    if (interval.keyboardActivity)
      convertedInterval.keyboardActivity = interval.keyboardActivity;

    if (interval.mouseActivity)
      convertedInterval.mouseActivity = interval.mouseActivity;

  }

  // Attach screenshot if it is exists
  if (screenshot)
    convertedInterval.screenshot = screenshot;

  try {

    // Storing interval into local DB
    const savedInterval = await database.Interval.create(convertedInterval);
    savedInterval._isBackedUp = true;
    return savedInterval;

  } catch (error) {

    log.error('INTCTRL00', 'Error while storing interval locally');
    throw error;

  }

};

/**
 * Push time interval, and (optionally) associated screenshot to the backend
 * @param   {Object}  interval             interval to push
 * @param   {Buffer}  [intervalScreenshot]   screenshot to push
 * @returns {Object}  Pushed interval
 */
module.exports.pushTimeInterval = async (interval, intervalScreenshot) => {

  const actualInterval = {

    taskId: interval.task_id,
    userId: interval.user_id,
    start: new Date(interval.start_at),
    end: new Date(interval.end_at),
    systemActivity: interval.activity_fill,

  };

  if (interval.keyboard_fill)
    actualInterval.keyboardActivity = interval.keyboard_fill;

  if (interval.mouse_fill)
    actualInterval.mouseActivity = interval.mouse_fill;

  // Check offline mode status
  if (OfflineMode.enabled && !interval._isDeferred) {

    log.warning('Intercepting time interval push request due to offline mode');
    return module.exports.backupInterval(actualInterval, intervalScreenshot);

  }

  try {

    // Push interval to the backend
    let pushedInterval = null;
    if (intervalScreenshot)
      pushedInterval = await api.intervals.createWithScreenshot(actualInterval, intervalScreenshot);
    else
      pushedInterval = await api.intervals.create(actualInterval);

    log.debug('Interval was synced');

    // Trigger connection restore in OfflineMode
    // OPTIMIZE: Can trigger deferredIntervalsPush and intervals will be send for second time
    OfflineMode.restoreWithCheck();

    return pushedInterval;

  } catch (error) {

    // Do not backup deferred intervals
    if (interval._isDeferred)
      throw error;

    // Trigger offline mode in case of network error
    if (error.isNetworkError) {

      OfflineMode.trigger();
      log.warning('Backing up time interval request due and triggering the offline mode');
      return module.exports.backupInterval({ ...interval }, intervalScreenshot);

    } else if (error.isApiError) {
      log.warning('Backing up time interval request');
      module.exports.backupInterval({ ...interval }, intervalScreenshot);
    }

    error.context = actualInterval;
    const crypto = require("crypto");
    error.context.client_trace_id = crypto.randomUUID();
    log.error('Error during interval & screenshot push', error);
    throw error;

  }

};

/**
 * Destroys interval on server
 * @param   {Number}  intervalId      id of interval to delete
 * @returns {Boolean} result destroy  result
 */
module.exports.destroyInterval = async intervalId => {

  try {

    // Delete request on server
    await api.intervals.remove(Number(intervalId));

    // Log changes
    log.debug(`Interval (${intervalId}) successfully destroyed`);

    // Everything is fine
    return true;

  } catch (error) {

    if (error.code === 'interval_already_deleted') {
      log.debug(`Interval (${intervalId}) already deleted`);
      return true;
    }

    log.error('Error during interval destroy', error);
    throw error;

  }

};

/**
 * Push all backed up intervals
 */
module.exports.backedUpIntervalsPush = async () => {

  // Check for backed up intervals
  const backedUpIntervals = await database.Interval.findAll({
    where: { synced: false },
  });

  // If any of them presented
  if (backedUpIntervals) {

    // Collecting promises
    const intervalPushPromises = [];
    backedUpIntervals.forEach(interval => {

      const formattedInterval = {
        task_id: interval.taskId,
        start_at: interval.startAt,
        end_at: interval.endAt,
        user_id: interval.userId,
        activity_fill: interval.systemActivity,
      };

      if (interval.keyboardActivity)
        formattedInterval.keyboard_fill = interval.keyboardActivity;

      if (interval.mouseActivity)
        formattedInterval.mouse_fill = interval.mouseActivity;

      intervalPushPromises.push(module.exports.pushTimeInterval(formattedInterval, interval.screenshot));

    });

    try {

      // Pushing all the intervals
      log.debug('Backed up intervals push initiated:');
      await Promise.all(intervalPushPromises);
      log.debug('Backed up intervals pushed successfully!');

    } catch (error) {

      log.error('Error during backed up intervals deffered push', error);
      throw error;

    }

    try {

      // Deleting synced intervals from local storage
      log.debug('Deleting backed up intervals...');
      await database.Interval.destroy({
        where: {},
        truncate: true,
      });
      log.debug('Backed up intervals deleted successfully!');

    } catch (error) {

      log.error('Error during backed up intervals delete', error);
      throw error;

    }

  }

};

/**
 * Removes interval locally
 * (only on backend side, no relation to frontend functionality)
 *
 * @async
 * @param {String} id Interval ID
 * @param {Object} options Additional options
 */
module.exports.removeInterval = async (id, opts) => {

  let interval = null;
  if (opts && opts.remoteIdentifier)
    interval = await database.Interval.findOne({ where: { remoteId: id } });
  else
    interval = await database.Interval.findOne({ where: { id } });

  if (!interval)
    throw new Error(`Interval #${id} does not exist`);

  // Destroy interval on remote if it is synced
  if (interval.synced)
    await module.exports.destroyInterval(interval.remoteId);

  await interval.destroy();

};

/**
 *
 * @param {Object} window should include app's title and executable info
 * @returns {Object} app's title, executable, and timestamps when the update has been pushed
 */
module.exports.pushActiveApplicationUpdate = async window => {

  const application = {
    title: window.title,
    executable: window.executable,
  };

  try {

    const pushedUpdate = await api.intervals.pushActiveApplicationUpdate(application);
    log.debug('Window update has been pushed');
    return pushedUpdate;

  } catch (error) {

    log.error('Error during current application usage update', error);
    throw error;

  }

};
