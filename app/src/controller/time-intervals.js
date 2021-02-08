/* eslint camelcase: 0 */
/* eslint no-warning-comments: 0 */

const api = require('../base/api');
const database = require('../models').db.models;
const Log = require('../utils/log');
const OfflineMode = require('../base/offline-mode');
const TaskTracker = require('../base/task-tracker');

const log = new Log('Controller:Time-Intervals');

/**
 * Number of synced intervals we keep in database queue
 * @type {Number}
 */
const NUMBER_OF_SYNCED_INTERVALS_TO_KEEP = 5;

/**
 * Returns all intervals in both latest pushed & unsynced queues
 * @async
 * @returns {Promise.<Interval[]>}
 */
module.exports.fetchIntervalsQueue = async () => database.Interval.findAll({ include: database.Task });

/**
 * Puts interval in the queue
 * @async
 * @param {Object} interval   Interval (API-formatted) to put into queue
 * @param {Buffer} screenshot Associated screenshot
 * @param {String} remoteId   Identifier of the interval on remote
 * @returns {Promise.<Interval>}
 */
module.exports.pushSyncedIntervalInQueue = async (interval, screenshot, remoteId) => {

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

  const formattedInterval = {
    taskId: interval.task_id,
    startAt: interval.start_at,
    endAt: interval.end_at,
    userId: interval.user_id,
    systemActivity: interval.activity_fill,
    keyboardActivity: interval.keyboard_fill,
    mouseActivity: interval.mouse_fill,
    synced: true,
    remoteId,
  };

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
  const convertedInterval = {
    taskId: interval.task_id,
    startAt: interval.start_at,
    endAt: interval.end_at,
    userId: interval.user_id,
    systemActivity: interval.activity_fill,
    keyboardActivity: interval.keyboard_fill,
    mouseActivity: interval.mouse_fill,
    synced: false,
  };

  // Attach screenshot if it is exists
  if (screenshot)
    convertedInterval.screenshot = screenshot;

  try {

    // Storing interval into local DB
    return await database.Interval.create(convertedInterval);

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
    keyboardActivity: interval.keyboard_fill,
    mouseActivity: interval.mouse_fill,

  };

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

    log.debug(`Interval was synced (assigned ID is ${pushedInterval.id})`);

    // Trigger connection restore in OfflineMode
    await OfflineMode.restoreWithCheck(TaskTracker.isActive);

    // Everything is fine
    return pushedInterval;

  } catch (error) {

    // Do not backup deferred intervals
    if (interval._isDeferred)
      throw error;

    // Trigger offline mode in case of network error
    if (error.isNetworkError) {

      OfflineMode.trigger();
      log.warning('Backing up time interval request due and triggering the offline mode');
      return module.exports.backupInterval(interval, intervalScreenshot);

    }

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
        keyboard_fill: interval.keyboardActivity,
        mouse_fill: interval.mouseActivity,
      };

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
 * @async
 * @param {String} id Interval ID
 */
module.exports.removeInterval = async id => {

  const interval = await database.Interval.findOne({ where: { id } });
  if (!interval)
    throw new Error(`Interval #${id} is not exists`);

  // Destroy interval on remote if it is synced
  if (interval.synced)
    await module.exports.destroyInterval(interval.remoteId);

  await interval.destroy();

};
