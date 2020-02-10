const EventEmitter = require('events');
const IOHook = require('@amazingcat/amazing-iohook');
const { Ticker } = require('../utils/ticker');
const Log = require('../utils/log');
const IntervalsController = require('../controller/time-intervals');
const TimeController = require('../controller/time');
const TaskController = require('../controller/tasks');
const Screenshot = require('../utils/screenshot');
const { UIError } = require('../utils/errors');
const { Task } = require('../models').db.models;
const Authentication = require('./authentication');
const OfflineMode = require('./offline-mode');
const cryptoRandom = require('../utils/crypto-random');

const log = new Log('TaskTracker');

/**
 * Task tracker
 * @extends EventEmitter
 */
class TaskTracker extends EventEmitter {

  /**
   * Initializes class
   */
  constructor() {

    // Inherit constructor
    super();

    /**
     * Current task
     * @type {Model<Task>|null}
     * @private
     */
    this._currentTask = null;

    /**
     * Previous task
     * @type {Model<Task>|null}
     */
    this._previousTask = null;

    /**
     * Instance of relatively stable ticker timer
     * @type {Ticker}
     * @private
     */
    this._ticker = new Ticker();

    /**
     * Current interval properties
     * @type {Object}
     * @private
     */
    this._currentInterval = {

      /**
       * When this interval was started
       * @type {Date|null}
       */
      startedAt: null,

      /**
       * Is this interval ever paused?
       * @type {Boolean}
       */
      everPaused: false

    };

    /**
     * Events counters
     * @type {Object}
     * @private
     */
    this._hidEvents = {};
    this._hidEvents.now = { click: 0, move: 0, keys: 0 };
    this._hidEvents.previous = { click: 0, move: 0, keys: 0 };
    this._hidEvents.currentInterval = { click: 0, move: 0, keys: 0 };

    /**
     * Inactivity detection thresholds
     * @type {Object}
     * @private
     */
    this._hidEvents.thresholds = { click: 0, move: 25, keys: 0 };

    /**
     * Activity check timer
     * @type {Number|null}
     * @private
     */
    this._checkTimer = null;

    /**
     * Delay before tracking will be stopped if inactivity detected
     * @type {number}
     * @private
     */
    this._stopTimeIfNoActivity = 60 * 1000;

    this._stopTimerIfNoActivity = null;

    /**
     * Interval of the intervals capture
     * @type {Number|null}
     * @private
     */
    this._captureTimerInterval = null;

    /**
     * Safe border to be sure that we will complete all the things before interval maximum time
     * In other words, how much seconds we will deduct from the screenshot_time value from server?
     * @type {Number}
     * @private
     */
    this._intervalSafeBorder = 10;

    /**
     * Max delay (interval length) for automatical interval capture
     * @type {Number}
     * @private
     */
    this._maximumIntervalCaptureDelay = null;

    /**
     * Min delay (interval length) for automatical interval capture
     * @type {Number}
     * @private
     */
    this._minimumIntervalCaptureDelay = 120 - this._intervalSafeBorder;

    /**
     * Delay for the activity check
     * @type {Number|null}
     * @private
     */
    this._checkActivityInterval = null;

    /**
     * If current HID IO events amount will be less than previous * THIS_COEFFICIENT,
     * we will detect the lower activity
     * @type {Number}
     * @private
     */
    this._lowerActivityCoefficient = 0.5;

    // Setup event counters
    IOHook.on('keydown', () => {

      this._hidEvents.now.keys += 1;
      this._hidEvents.currentInterval.keys += 1;

    });

    IOHook.on('mousemove', () => {

      this._hidEvents.now.move += 1;
      this._hidEvents.currentInterval.move += 1;

    });

    IOHook.on('mousewheel', () => {

      this._hidEvents.now.move += 1;
      this._hidEvents.currentInterval.move += 1;

    });

    IOHook.on('mousedown', () => {

      this._hidEvents.now.click += 1;
      this._hidEvents.currentInterval.click += 1;

    });

    // Pass each tracked second to frontend
    this._ticker.on('tick', () => {

      // Increment overall tracked time counter
      this._currentTaskTrackedTime += 1;

      // Pass tick event to the TimeTracker context
      this.emit('tick', this._currentTaskTrackedTime);

      // Capture interval if time is up
      if (this._ticker.ticks === this._captureTimerInterval) {

        // Emitting an event
        this.emit('interval-capture', {});

      }

    });

    this.on('interval-removed', async interval => {

      await TimeController.saveTrackedTime(interval.task.id, interval.duration, 'subtract');
      if (this._currentTask && this._currentTask.id === interval.task.id)
        this._currentTaskTrackedTime -= interval.duration;

      if (this._currentTaskTrackedTime < 0)
        this._currentTaskTrackedTime = 0;

    });

    // Passing ticker counter reset event to renderer
    this._ticker.on('reset-counter', () => this.emit('reset', {}));

    /**
     * Activity check function
     */
    this.on('activity-check', async () => {

      // Checking activity
      if (

        // Mouse move activity
        (this._hidEvents.now.move <= this._hidEvents.thresholds.move) &&

        // Mouse click activity
        (this._hidEvents.now.click <= this._hidEvents.thresholds.click) &&

        // Keyboard press activity
        (this._hidEvents.now.keys <= this._hidEvents.thresholds.keys)

      ) {

        // Inactivity detected
        log.debug('Inactivity detected, countdown emission');

        await this._stopCheckActivityTimer();

        // Emitting inactivity event to frontend
        this.emit('activity-proof-request', this._stopTimeIfNoActivity);

        if (!this._stopTimerIfNoActivity)
          this._stopTimerIfNoActivity = setTimeout(() => this.emit('activity-proof-result', false), this._stopTimeIfNoActivity + 10000);

      }

      // Clear "now" counters
      this.clearEventCounters(true, false, false);

    });

    // Handles signal from renderer on inactivity confirmation
    this.on('activity-proof-result', async result => {

      if (this._stopTimerIfNoActivity) {

        clearTimeout(this._stopTimerIfNoActivity);
        this._stopTimerIfNoActivity = null;

      }

      if (!this.active)
        return;

      // Activity confirmed by user iteraction
      if (result) {

        log.debug('Activity confirmed');

        this.emit('activity-proof-result-accepted', result);

        await this._startCheckActivityTimer();

        this.clearEventCounters(true, false, false);
        return;

      }

      // Inactivity confirmed, stopping the tracker
      log.debug('Activity not confirmed, stopping timer');

      this.emit('activity-proof-result-not-accepted', {
        duration: this._ticker.ticks,
        task: { id: this.currentTask.id, },
      });

      // Stopping the ticker
      await this.stop(false);

    });

    /**
     * Interval / Screenshot capture function
     */
    this.on('interval-capture', async () => {

      // рнting current amount of ticks, then resetting the timer
      const { ticks } = this._ticker;
      this._ticker.reset();

      // Push interval
      await this.captureInterval(ticks);

      // Calculate next screenshot interval
      const updatedCaptureDelay = await this.calculateNextCaptureDelay();

      // Dump all counters to the "previous" block
      this._hidEvents.previous.keys = this._hidEvents.currentInterval.keys;
      this._hidEvents.previous.move = this._hidEvents.currentInterval.move;
      this._hidEvents.previous.click = this._hidEvents.currentInterval.click;

      // Clear events counters
      this.clearEventCounters(false, false, true);

      // Clear flags
      this._currentInterval.startedAt = new Date();
      this._currentInterval.everPaused = false;

      // Apply new capture interval
      this._captureTimerInterval = updatedCaptureDelay;
      log.debug(`Updater interval capture duration is ${updatedCaptureDelay} seconds`);

    });

  }

  /**
   * Returns tracker status
   * @return {Boolean} Is tracking active?
   */
  get active() {

    return (this._ticker && this._ticker.status === true);

  }

  /**
   * Returns current task
   * @return {Model<Task>|null}  Current task (null, if tracker is stopped)
   */
  get currentTask() {

    return this._currentTask;

  }

  /**
   * Returns current interval duration in seconds
   * @return {Number} Amount of ticks on ticker timer
   */
  get currentTicks() {

    return this._ticker.ticks;

  }

  /**
   * Unloads HID event listener
   */
  unloadIOHook() {

    /* eslint class-methods-use-this: 0 */
    IOHook.unload();

  }

  /**
   * Clears the different event counters groups
   * @param  {Boolean} [now=true]             Should we clear "now" counters group
   * @param  {Boolean} [previous=true]        Should we clear "previous" counters group
   * @param  {Boolean} [currentInterval=true] Should we clear counters for the current interval
   */
  clearEventCounters(now = true, previous = true, currentInterval = true) {

    // Clear "now" event counters
    if (now) {

      this._hidEvents.now.keys = 0;
      this._hidEvents.now.move = 0;
      this._hidEvents.now.click = 0;

    }

    // Clear event counters for the last interval
    if (previous) {

      this._hidEvents.previous.keys = 0;
      this._hidEvents.previous.move = 0;
      this._hidEvents.previous.click = 0;

    }

    // Clear event counters for the current interval
    if (currentInterval) {

      this._hidEvents.currentInterval.keys = 0;
      this._hidEvents.currentInterval.move = 0;
      this._hidEvents.currentInterval.click = 0;

    }

  }

  /**
   * Calculate interval length according to the user activity
   * @return {Promise<Number>} Recalculated interval length
   */
  async calculateNextCaptureDelay() {

    // Checking is current interval activity lower than at previous one
    if (

      (this._hidEvents.currentInterval.keys <= this._hidEvents.previous.keys * this._lowerActivityCoefficient) &&
      (this._hidEvents.currentInterval.move <= this._hidEvents.currentInterval.move * this._lowerActivityCoefficient)

    ) {

      // Generate new interval, less than current
      let newDelay = await cryptoRandom(this._minimumIntervalCaptureDelay, this._captureTimerInterval);
      newDelay = Math.floor(newDelay / 2);

      // If new interval delay is too short, return the minimum possible one
      if (newDelay < this._minimumIntervalCaptureDelay)
        return this._minimumIntervalCaptureDelay;

      // Return
      return newDelay;

    }

    let newIntervalDelay = await cryptoRandom(this._minimumIntervalCaptureDelay, this._captureTimerInterval);
    newIntervalDelay += this._minimumIntervalCaptureDelay;
    newIntervalDelay = Math.floor(newIntervalDelay);

    // Checking if this interval delay greater than maximum allowed one
    if (newIntervalDelay > this._maximumIntervalCaptureDelay)
      return this._maximumIntervalCaptureDelay;

    return newIntervalDelay;

  }

  /**
   * Start activity check timer
   * @return {Promise<void>}
   * @private
   */
  async _startCheckActivityTimer() {

    if (!this._checkTimer)
      this._checkTimer = setInterval(() => this.emit('activity-check'), this._checkActivityInterval * 1000);

  }

  /**
   * Stopping activity check timer
   * @return {Promise<void>}
   * @private
   */
  async _stopCheckActivityTimer() {

    if (this._checkTimer) {

      clearInterval(this._checkTimer);
      this._checkTimer = null;

    }

  }


  /**
   * Starts tracking
   * @param  {String}                    [taskId]  Identifier of the target task (last task will be tracked if ID is not set)
   * @return {Promise<Boolean|Error>}              True, if task is started, Error otherwise
   */
  async start(taskId) {

    /**
     * Type of action we will perform (task start / switch)
     * @type {String}
     */
    let startAction = '';

    // Checking input argument
    if (typeof taskId === 'undefined') {

      // Is current task running?
      if (this._currentTask)
        throw new UIError(500, 'TaskTracker.start called without taskId when current task is running', 'ETSTR0');

      // Checking for last task prescense
      if (!this._previousTask)
        throw new UIError(500, 'TaskTracker.start called without taskId for the first time after launch', 'ETSTR1');

      // Set previous task as a current one
      this._currentTask = this._previousTask;
      startAction = 'started';

    } else {

      // Getting task by identifier
      const targetTask = await Task.findOne({ where: { id: taskId } });

      // Is this task exists
      if (!targetTask)
        throw new UIError(404, 'TaskTracker.start called with taskId which is not exists');

      // Stopping current task if it is active
      if (this._currentTask) {

        this.emit('switching', { from: this._currentTask.id, to: taskId });

        await this.stop(true, false);
        startAction = 'switched';

      } else
        startAction = 'started';

      // Set target task as current
      this._currentTask = targetTask;

    }

    // Calculating the interval duration
    // Server returns time popup in minutes, so we have to transfer it to seconds
    // Decreasing it by 10 seconds to make sure that we will capture interval in a time
    const currentUser = await Authentication.getCurrentUser();
    this._checkActivityInterval = currentUser.inactivityTimeout * 60;
    this._maximumIntervalCaptureDelay = (currentUser.screenshotsInterval * 60) - this._intervalSafeBorder;
    this._captureTimerInterval = this._maximumIntervalCaptureDelay;
    await this._startCheckActivityTimer();

    // Time tracked to current task
    this._currentTaskTrackedTime = await TaskController.getTaskTodayTime(this._currentTask.id);

    // Interval start timestamp
    this._currentInterval.startedAt = new Date();

    // Starting listening for the events
    IOHook.start();

    // Resetting and starting the ticker
    this._ticker.reset();
    this._ticker.start();
    log.debug(`Started tracking task "${this._currentTask.name}" (period duration is ${this._captureTimerInterval}s)`);

    // Emit proper event
    this.emit(startAction, this._currentTask.id);

  }

  /**
   * Stops tracking
   * @param  {Boolean}                 [pushInterval=true]  Should we push this interval
   * @param  {Boolean}                 [emitEvent=true]     Should we emit "stopped" event
   * @return {Promise<Boolean|Error>}                       True if success, Error otherwise
   */
  async stop(pushInterval = true, emitEvent = true) {

    if (!this.active)
      return false;

    if (emitEvent)
      this.emit('stopping');

    // Getting ticks amount and stopping ticker
    const { ticks } = this._ticker;
    this._ticker.stop(false);

    // Stop event handling
    log.debug(`Stops task tracking (push = ${pushInterval ? 'ok' : 'no'}, event = ${emitEvent ? 'ok' : 'no'})`);

    // Stopping activity check timer
    this._stopCheckActivityTimer();

    // Pushing interval
    if (pushInterval) {

      // Capturing interval if it's longer than one second
      if (ticks >= 1)
        await this.captureInterval();
      else
        log.warning('Ignoring interval which is less than one second');

    } else
      log.debug('no interval sending');


    // Emit event if it is not restricted
    if (emitEvent)
      this.emit('stopped');

    // Move current task to previous
    this._previousTask = this._currentTask;
    this._currentTask = null;

    // Reset everPaused flag
    this._currentInterval.everPaused = false;

    // Resets all the counters
    this.clearEventCounters(true, true, true);

    // That's all
    return true;

  }

  async pauseTicker() {

    if (!this._ticker.paused)
      this._ticker.pause();

  }

  async resumeTicker() {

    if (this._ticker.paused)
      this._ticker.resume();

  }

  /**
   * Captures an interval and pushed it to the server
   * @param  {Number}                  [ticks]                  Amount of ticks to override the ticker value
   * @param  {Boolean}                 [showNotification=true]  Should we show screenshot notification?
   * @return {Promise<Boolean|Error>}                           Returns true if succeed, error otherwise
   */
  async captureInterval(ticks) {

    if (!this._currentTask) {

      log.debug('Can\t find current task!');
      return false;

    }

    try {

      /* eslint camelcase: 0 */
      const currentUser = await Authentication.getCurrentUser();

      // Calculating amount of ticks
      ticks = ticks || this.currentTicks;

      // Saving timestamp of this period end (NOW moment)
      let { startAt } = this._currentInterval;
      let endAt = new Date();

      // Calculate start date using few conditions
      if (

        // If current tick start date is not set (race condition or some other shitty reason)
        (!startAt || typeof startAt !== 'object' || typeof startAt.getTime !== 'function') ||

        // If delta between interval start & stop too large
        (endAt.getTime() - startAt.getTime() > ((ticks + this._intervalSafeBorder) * 1000)) ||

        // Pause detected during this interval
        this._currentInterval.everPaused

      )
        startAt = new Date(endAt.getTime() - (ticks * 1000));

      // Check interval duration
      if (ticks === 0 || (endAt - startAt) < 1000) {

        log.warning('Ignore capture for interval less than 1 second');
        return false;

      }

      // Convert start and stop dates into ISO formatted strings
      startAt = startAt.toISOString();
      endAt = endAt.toISOString();

      // Logging this period
      log.debug(`Capturing interval: ${startAt} ~ ${endAt} (duration: ${ticks} ticks)`);

      // Creating interval object
      const interval = {

        task_id: this._currentTask.externalId,
        start_at: startAt,
        end_at: endAt,
        user_id: currentUser.id,
        count_mouse: this._hidEvents.currentInterval.move + this._hidEvents.currentInterval.click,
        count_keyboard: this._hidEvents.currentInterval.keys

      };

      // Saving time interval
      await TimeController.saveTrackedTime(this._currentTask.id, ticks);
      log.debug(`Track time is updated (+${ticks} ticks)`);

      // Creating screenshot
      let intervalScreenshot = null;

      // Future: properly handle screenshotsEnable option
      intervalScreenshot = await Screenshot.makeScreenshot();
      log.debug('Screenshot was made');

      // Pushing interval
      try {

        // Pushing interval
        const pushedInterval = await IntervalsController.pushTimeIntervalAndScreenshot(interval, intervalScreenshot);

        // Hotfix for shitty error handling on backend
        if (typeof pushedInterval.id === 'undefined')
          throw new UIError('ETRCK00', `Interval validation error, between ${startAt} and ${endAt}`);

        log.debug(`Interval was synced (assigned ID is ${pushedInterval.id})`);

        // Notifies user
        this.emit('interval-pushed', {
          screenshot: intervalScreenshot,
          interval: {
            remote: pushedInterval,
            task: this._currentTask.dataValues,
            duration: ticks
          }
        });

      } catch (error) {

        // Check is this server connectivity error
        if (error.request) {

          // Trigger offline mode
          OfflineMode.trigger();

          // Backup data to local DB
          await IntervalsController.backupInterval(interval, intervalScreenshot);

        } else {

          // Bypass non-connectivity errors
          throw error;

        }

        return false;

      }

      return true;

    } catch (error) {

      // Transparently pass all UIErrors
      if (error instanceof UIError)
        throw error;

      // Handle errors
      log.error('Error occured during the interval submit', error);
      throw new UIError(500, `Unhandled system error occured: ${error}`, 'EAUTH502');

    }

  }

}

/**
 * Exports single instance of TaskTracker
 * @type {TaskTracker}
 */
module.exports = new TaskTracker();
