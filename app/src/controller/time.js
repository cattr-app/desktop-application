/* eslint camelcase: 0 */
/* eslint no-warning-comments: 0 */

const Time = require('../base/api').time;
const Tasks = require('./tasks');
const auth = require('../base/authentication');
const database = require('../models').db.models;
const Log = require('../utils/log');
const OfflineMode = require('../base/offline-mode');
const { UIError } = require('../utils/errors');

const log = new Log('Controller:Time');

/**
 * Returns today local 00:00 in UTC timezone as ISO string
 * @param  {Boolean}      [formatted]  Should we output today 00:00 as
 * @return {String|Date}               ISO string or Date instance with today's local 00:00 in UTC time
 */
const todayISO = (formatted = false) => {

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  return formatted ? today.toISOString() : today;

};


/**
 * Returns today local midnight
 * @return {Date} Date object
 */
const todayLocalTimezone = () => {

  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;

};

/**
 * Upserting time track
 * @param  {Object<Date>}   day            [description]
 * @param  {Number}         taskId         [description]
 * @param  {Number}         time           [description]
 */
const upsertInterval = async (day, taskId, time) => {

  // Get task from local database
  const localTask = await database.Task.findOne({ where: { externalId: taskId }, paranoid: false });

  // Do nothing if task not found in local storage
  if (!localTask)
    return;

  // Get track related to this task
  const track = await database.Track.findOne({ where: { day, taskId: localTask.id } });

  // Get related deferred intervals
  const deferred = await database.Interval.findAll({ where: { taskId: localTask.id } });

  // Updating existing track
  if (track) {

    if (!deferred)
      track.overallTime = time;
    else
      track.overallTime = time + deferred.reduce((acc, i) => acc + Math.round((i.endAt - i.startAt) / 1000), 0);

    await track.save();
    return;

  }

  // New track
  const tracky = new database.Track({ day: todayLocalTimezone(), taskId: localTask.id, overallTime: time });
  await tracky.save();

};

/**
 * Syncs worked time for all the tasks
 * @return {Promise} [description]
 */
module.exports.syncTasksTime = async () => {

  // Handle offline mode
  if (OfflineMode.enabled) {

    log.debug('Intercepted worked time sync request due to offline mode');
    return true;

  }

  try {

    log.debug('Starting syncing time per task values');
    const serverTime = await Time.getPerTasks({

      user_id: (await auth.getCurrentUser()).id,
      start_at: todayISO(true),

    });

    // Is any tracks recevied?
    if (Array.isArray(serverTime)) {

      // Applying server data to
      const commitsPool = [];

      // TODO Remove internal tasks filtering
      serverTime

        // Add midnight timestamp
        .map(task => {

          // Modify dates
          task._day = new Date(task.end); // eslint-disable-line no-param-reassign
          task._day.setHours(0, 0, 0, 0); // eslint-disable-line no-param-reassign

          // Return modified object
          return task;

        })

        // Upsert time to database
        .forEach(task => commitsPool.push(upsertInterval(task._day, task.id, task.time)));

      // Resolve all the upserts
      await Promise.all(commitsPool);

    }

    log.debug('Finished syncing time per task values');
    return true;

  } catch (error) {

    // Transparently pass all UIErrors
    if (error instanceof UIError)
      throw error;

    // Handle operating errors
    log.error('Error ocurred during synchronisation of worked time', error);
    throw new UIError(500, 'Unhandled system error occured', 'ECTM501', error);

  }

};

// Return total time worked for today
module.exports.getUserTotalTimeForToday = async userId => {

  // Setting boundaries for today
  const todayMidnight = todayLocalTimezone();
  const almostNextMidnight = new Date();
  almostNextMidnight.setHours(23, 59, 59, 0);

  // Creating options for total time request
  const totalTimeOptions = {
    user_id: userId,
    start_at: todayMidnight,
    end_at: almostNextMidnight,
  };

  try {

    // Fetch total time from server
    const overallTime = await Time.getTotal(totalTimeOptions);
    return overallTime;

  } catch (error) {

    // Transparently pass all UIErrors
    if (error instanceof UIError)
      throw error;

    // Handle operating errors
    log.error('Error ocurred during synchronisation of today total time', error);
    throw new UIError(500, 'Unhandled system error occured', 'ECTM502', error);

  }

};

module.exports.getLocalTotalTimeForToday = async () => {

  let totalTime = 0;
  const todayMidnight = todayLocalTimezone();
  const almostNextMidnight = new Date();
  almostNextMidnight.setHours(23, 59, 59, 0);

  const tasks = await Tasks.getTasksList();

  const tasksMap = tasks.map(task => ({
    externalId: task.id,
  }));

  // eslint-disable-next-line no-restricted-syntax
  for await (const task of tasksMap) {

    const taskTime = await Tasks.getTaskTodayTime(task.externalId);
    totalTime += taskTime;

  }

  const time = {
    start: todayMidnight,
    end: almostNextMidnight,
    time: totalTime,
  };

  return time;

};

module.exports.getTasksTimeForToday = async () => Time.getPerTasks({

  user_id: (await auth.getCurrentUser()).id,
  start_at: todayISO(true),

});

/**
 * Saves tracked ticks
 * @param  {String}                  taskId             Local identifier of the task
 * @param  {Number}                  time               Delta of tracked time
 * @param  {String}                  [action='append']  Action (append or subtract)
 * @return {Promise<Boolean|Error>}                     Returns true if succeed
 */
module.exports.saveTrackedTime = async (taskId, time, action = 'append') => {

  if (typeof action !== 'string' || (action !== 'append' && action !== 'subtract'))
    throw new TypeError('Tracked time action must be "append" or "subtract"');


  try {

    // Getting track from database
    const trackFromDatabase = await database.Track.findOne({ where: { taskId, day: todayLocalTimezone() } });

    // Updating track if it's exists
    if (trackFromDatabase) {

      if (action === 'append')
        trackFromDatabase.overallTime += time;
      else
        trackFromDatabase.overallTime -= time;

      if (trackFromDatabase.overallTime < 0)
        trackFromDatabase.overallTime = 0;

      await trackFromDatabase.save();
      log.debug(`Updated track for task (${taskId}): ${trackFromDatabase.overallTime}s (delta = ${action === 'append' ? '+' : '-'}${time}s)`);
      return true;

    }

    // Creating new one only in case of time append (ignore substraction)
    if (action === 'subtract')
      return true;

    const newTrack = new database.Track({ taskId, day: todayLocalTimezone(), overallTime: time });
    await newTrack.save();
    log.debug(`Created a new track for task (${taskId}): ${time}`);
    return true;

  } catch (error) {

    // TransparenttrackFromDatabasely pass all UIErrors
    if (error instanceof UIError)
      throw error;

    // Handle operating errors
    log.error('Error occured during pushing saved tracked time', error);
    throw new UIError(500, 'Unhandled system error occured', 'ECTM503', error);

  }

};
