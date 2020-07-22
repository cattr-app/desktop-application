const IntervalsController = require('../controller/time-intervals');
const TimeIntervalModel = require('../models').db.models.Interval;
const Log = require('../utils/log');
const OfflineMode = require('./offline-mode');

const log = new Log('DeferredHandler');

/**
 * If deferred intervals push procedure is already running,
 * we should lock this from more executions to avoid collisions
 * @type {Boolean}
 */
let threadLock = false;

/**
 * Pushes deferred intervals
 * @return {Promise<Boolean|Error>} True, if everything is pushed, error otherwise
 */
const deferredIntervalsPush = async () => {

  // Check thread lock
  if (threadLock)
    return;

  // Locking thread
  threadLock = true;

  // Getting all deferred intervals
  const deferredIntervals = await TimeIntervalModel.findAll();

  // Skip sync routine if there are no deffered intervals
  if (deferredIntervals.length === 0) {

    threadLock = false;
    return;

  }

  // Catching all the deferred intervals errors
  try {

    // Iterating over deferred intervals
    // eslint-disable-next-line no-restricted-syntax
    for await (const rawInterval of deferredIntervals) {

      // Prepare interval structure
      /* eslint camelcase: 0 */
      const preparedInterval = {

        _isDeferred: true,
        task_id: rawInterval.taskId,
        start_at: rawInterval.startAt,
        end_at: rawInterval.endAt,
        user_id: rawInterval.userId,
        activity_fill: rawInterval.systemActivity,
        mouse_fill: rawInterval.mouseActivity,
        keyboard_fill: rawInterval.keyboardActivity,

      };

      // Push deferred interval
      let res = null;

      if (rawInterval.screenshot)
        res = await IntervalsController.pushTimeInterval(preparedInterval);
      else
        res = await IntervalsController.pushTimeInterval(preparedInterval, rawInterval.screenshot);

      log.debug(`Deferred interval (${res.id}) has been pushed`);

      // Remove raw interval from database
      await rawInterval.destroy();

    }

    // That's all
    log.debug('Deferred screenshots queue is empty, nice work');

  } catch (error) {

    // Handle connectivity errors
    if (error.request && !error.response) {

      // Trigger offline mode then exit
      OfflineMode.trigger();

      // Unlocking thread
      threadLock = false;

      // Ignore this error
      return;

    }

    // Log other errors
    log.warning(`Error occured during deferred intervals push: ${error}`);
    throw error;

  }

  // Unlocking thread
  threadLock = false;

};

// Push deferred intervals if connection is restored
OfflineMode.on('connection-restored', deferredIntervalsPush);
