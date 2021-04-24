const { EventEmitter } = require('events');
const { powerMonitor } = require('electron');
const Log = require('../utils/log');
const { Task } = require('../models').db.models;
const { Ticker } = require('../utils/ticker');
const { UIError } = require('../utils/errors');
const OfflineMode = require('./offline-mode');
const Screenshot = require('../utils/screenshot');
const Authentication = require('./authentication');
const TimeController = require('../controller/time');
const TaskController = require('../controller/tasks');
const IntervalsController = require('../controller/time-intervals');
const eventCounter = require('../utils/event-counter');
const heartbeatMonitor = require('../utils/heartbeat-monitor');

const log = new Log('TaskTracker');

class TaskTracker extends EventEmitter {

  constructor() {

    super();

    /**
     * Tracker status (active or not)
     * @type {Boolean}
     */
    this.active = false;

    /**
     * Designated time counter (ticker)
     * @type {Ticker}
     */
    this.ticker = new Ticker();

    /**
     * Duration of activity proof countdown popup
     * @type {Number} Amount of seconds given to prove activity
     */
    this.activityProofDuration = 60;

    /**
     * Current tracking task
     * @type {Model<Task>|null}
     */
    this.currentTask = null;

    /**
     * Previous (last tracked) task
     * @type {Model<Task>|null}
     */
    this.previousTask = null;

    /**
     * Identifier of inactivity detection timer
     * @type {Number|null}
     */
    this.inactivityDetectionTimerId = null;

    /**
     * Identifier of timer, responsible for negative prove result of activity popup
     * @type {Number|null}
     */
    this.activityProofTimeoutTimerId = null;

    /**
     * Inactivity tracking timeout (i.e., how many seconds of inactivity is allowed)
     * @type {Number|null} Inactivity timeout in seconds
     */
    this.inactivityTimeLimit = null;

    /**
     * Time between interval capture and send
     * @type {Number|null} Amount of seconds between interval capture
     */
    this.captureInterval = null;

    /**
     * Properties of active (currently tracked) interval
     * @type {Object}
     */
    this.currentInterval = {

      /**
       * Timestamp of beggining of this interval
       * @type {Date|null}
       */
      startedAt: null,

      /**
       * Flag indicates does this interval being paused / interrupted
       * @type {Boolean}
       */
      everPaused: false,

    };

    /**
     * Amount of time, tracked to active task for today
     * @type {Number|null}
     */
    this.currentTaskTimeTrackedToday = null;

    /**
     * Handles result of activity proving verification round
     */
    this.on('activity-proof-result', async result => {

      // Disarm kill-switch/timeout keeper of this prove request
      if (this.activityProofTimeoutTimerId) {

        clearTimeout(this.activityProofTimeoutTimerId);
        this.activityProofTimeoutTimerId = null;

      }

      // Soft-fail if tracker is not active
      if (!this.active)
        return;

      // Keep tracking, if request has been proven
      if (result) {

        // Dispatch activity proven event
        log.debug('Activity proven by interactive popup');
        this.emit('activity-proof-result-accepted', true);

        // Start inactivity detection
        this.startInactivityDetection();
        return;

      }

      // Inactivity is not detected, dispatching corresponding event
      log.debug('Activity is not confirmed via interactive popup, stopping tracker');
      this.emit('activity-proof-result-not-accepted', {
        duration: this.ticker.ticks,
        task: { id: this.currentTask.id },
      });

      // Stopping the tracker
      await this.stop(false);

    });

    /**
     * Handles each tick of ticker
     */
    this.ticker.on('tick', () => {

      // Increment time tracked for current task
      this.currentTaskTimeTrackedToday += 1;

      // Dispatch tick event into tracker context
      this.emit('tick', this.currentTaskTimeTrackedToday);
      this.emit('tick-relative', this.ticker.ticks);

      // Dispatch interval capture transactional event, if it is the right time
      if (this.ticker.ticks === this.captureInterval)
        this.emit('interval-capture');

    });

    /**
     * Handles "interval-removed" event from some other source
     */
    this.on('interval-removed', async interval => {

      // Commit subtractioned interval time
      await TimeController.saveTrackedTime(interval.task.id, interval.duration, 'subtract');

      // Subtract time from local buffer, if this interval is rely on current task
      if (this.currentTask && this.currentTask.id === interval.task.id) {

        this.currentTaskTimeTrackedToday -= interval.duration;

        // Keep tracked time gte than zero, in case of some unpredicted deviations
        if (this.currentTaskTimeTrackedToday < 0)
          this.currentTaskTimeTrackedToday = 0;

      }

    });

    /**
     * Handles the "interval-capture" transactional event
     */
    this.on('interval-capture', async () => {

      // Saving current ticks counter value, then reset the ticker
      const { ticks } = this.ticker;
      this.ticker.reset();

      // Capture & push interval
      this.captureCurrentInterval(ticks, this.currentInterval.startedAt, new Date());

      // Recalculate new interval startAt
      const newStartAt = new Date();
      newStartAt.setSeconds(newStartAt.getSeconds() + 1);

      // Reset currentInterval properties
      this.currentInterval.startedAt = new Date(newStartAt);
      this.currentInterval.everPaused = false;

      log.debug('Interval captured by timer request');

    });

  }

  /**
   * Current tracking status (is task tracking active right now)
   * @type {Boolean}
   */
  get isActive() {

    return Boolean(this.active);

  }

  /**
   * Updates tracker status
   * @param {*} status
   */
  setTrackerStatus(status) {

    this.active = Boolean(status);
    OfflineMode.setTrackerStatus(status);

  }

  /**
   * Starts inactivity detection
   * @returns {Number} ID of corresponding inactivity detection timer
   */
  startInactivityDetection() {

    // Restrict more than one inactivity detectors at a time
    if (this.inactivityDetectionTimerId)
      throw new UIError(500, 'Reject request to spawn overlapping inactivity detector');

    // Starts new interval timer to check idle time each second
    this.inactivityDetectionTimerId = setInterval(() => {

      // Get system idle time counter
      const currentIdleTime = powerMonitor.getSystemIdleTime();

      // Handle inactivity, if system idle time is over the limit for this account
      if (currentIdleTime > this.inactivityTimeLimit) {

        // Dispatch corresponing event
        this.emit('inactivity-detected');

        // Trigger inactivity detection routine
        this.triggerInactivityDetection();

        // Stops this interval timer
        clearInterval(this.inactivityDetectionTimerId);
        this.inactivityDetectionTimerId = null;

      }

    }, 1000);

    return this.inactivityDetectionTimerId;

  }

  /**
   * Stops inactivity detection
   * @returns {Boolean} True, if everything is OK. False if soft-failed.
   */
  stopInactivityDetection() {

    // Soft-fail if inactivity detector is not running
    if (!this.inactivityDetectionTimerId)
      return false;

    // Stop interval timer, then clear detection timer ID
    clearInterval(this.inactivityDetectionTimerId);
    this.inactivityDetectionTimerId = null;
    return true;

  }

  /**
   * Routine, triggers on inactivity detection
   */
  triggerInactivityDetection() {

    log.debug('Inactivity detected, emit activity proof request');

    // Dispatch activity proof request event
    this.emit('activity-proof-request', this.activityProofDuration * 1000);

    // Starting kill-switch / timeout for activity proof
    // If activity won't be verified within allowed time, this
    // timeout will report "false" verification result
    this.activityProofTimeoutTimerId = setTimeout(
      () => this.emit('activity-proof-result', false),
      (this.activityProofDuration + 1) * 1000,
    );

  }

  /**
   * Pause ticker & inactivity detector
   * For example, this method invokes by power-manager to keep tracker state correct
   * between sleep or hybernation procedures
   */
  async pauseTicker() {

    // Pausing ticker
    if (!this.ticker.paused)
      this.ticker.pause();

    // Stopping inactivity detector
    this.stopInactivityDetection();

    // Mark interval as interrupted
    if (this.active)
      this.currentInterval.everPaused = true;

  }

  /**
   * Resume ticker & inactivity detection after pause
   */
  async resumeTicker() {

    // Starting tracker
    if (this.ticker.paused)
      this.ticker.resume();

    // Starting inactivity detector
    this.startInactivityDetection();

  }

  /**
   * Starts tracking
   * @async
   * @param {String} [taskId] UUID of task to track (default: last tracked task)
   */
  async start(taskId) {

    // Action to dispatch (task "started" or "switched")
    let action = null;

    // Handle re-start of last tracked task case
    if (typeof taskId !== 'string') {

      // Fail if tracker is already active
      if (this.active || this.currentTask)
        throw new UIError(500, 'Overlapping tracker start request rejected');

      // Fail if there is nothing to switch back to
      if (!this.previousTask)
        throw new UIError(500, 'Tracker re-start request rejected due to lack of previous task');

      // Set previous task as current
      this.currentTask = this.previousTask;
      action = 'started';

    } else {

      // Getting task by defined UUID
      const task = await Task.findByPk(taskId);
      if (!task)
        throw new UIError(500, `Tracker start request rejected due to inability to find a task with id: ${taskId}`);

      // If tracker is active, initialise task switching
      if (this.active && this.currentTask) {

        // Dispatch switching event with target task info
        action = 'switched';
        this.emit('switching', { from: this.currentTask.id, to: task.id });

        // Stopping current task
        await this.stop(true, false);

      } else {

        // Dispatch "started" event when tracker start-up routine will be finished
        action = 'started';

      }

      // Set target task as current one
      this.currentTask = task;

    }

    // Get current user properties, then calculate all necessary intervals
    const currentUser = await Authentication.getCurrentUser();
    this.inactivityTimeLimit = currentUser.inactivityTimeout * 60;
    this.captureInterval = currentUser.screenshotsInterval * 60;

    // Populate necessary properties
    this.currentInterval.startedAt = new Date();
    this.currentInterval.everPaused = false;
    this.currentTaskTimeTrackedToday = await TaskController.getTaskTodayTime(this.currentTask.id);

    // Enable inactivity detection
    this.startInactivityDetection();

    // Enable event counter
    eventCounter.start();

    // Enable heartbeat
    if (!OfflineMode.enabled)
      heartbeatMonitor.start();
    else
      log.debug('Skipping heartbeat enabling, since we\'re offline');

    // Reset & start time counter
    this.ticker.reset();
    this.ticker.start();

    // Dispatch corresponding event
    this.setTrackerStatus(true);
    this.emit(action, this.currentTask.id);
    log.debug(`Started task "${this.currentTask.name}" with ${this.captureInterval}s capture interval`);

  }

  /**
   * Stops tracking
   * @async
   * @param {Boolean} [pushInterval = true] Will this interval be pushed to backend?
   * @param {Boolean} [emitEvent = true] Will 'stopping' and 'stopped' events be dispatched?
   */
  async stop(pushInterval = true, emitEvent = true) {

    // Soft-fail if tracker is not active
    if (!this.active)
      return false;

    // Dispatch transactional event
    if (emitEvent)
      this.emit('stopping');


    // Stop inactivity detection
    this.stopInactivityDetection();

    // Get amount of ticks, then stop the timer
    const { ticks } = this.ticker;
    this.ticker.stop(true);

    log.debug(`Executing tracker stop request (push = ${pushInterval}, dispatch = ${emitEvent})`);

    // Capturing & pushing interval, if it is longer than one second
    if (pushInterval && (ticks >= 1))
      await this.captureCurrentInterval(ticks);

    // Move current task to previous, reset active flag
    this.setTrackerStatus(false);
    this.previousTask = this.currentTask;
    this.currentTask = null;

    // Reset current interval states
    this.currentInterval.startedAt = null;
    this.currentInterval.everPaused = false;

    // Stop event counter
    eventCounter.stop();

    // Stop heartbeat
    heartbeatMonitor.stop();

    // Ensure that activity proof timeout is suspended
    if (this.activityProofTimeoutTimerId) {

      clearTimeout(this.activityProofTimeoutTimerId);
      this.activityProofTimeoutTimerId = null;

    }

    // Emit transactional event
    if (emitEvent)
      this.emit('stopped');

    return true;

  }

  /**
   * Captures current time interval, then submits it to the backend
   * @async
   * @param {Number} [ticksOverride] Amount of ticks tracked during this time interval
   */
  async captureCurrentInterval(ticksOverride, startAtRaw, endAtRaw) {

    // Fail if timer is stopped, or current task canno't be obtained
    if (!this.active || !this.currentTask)
      throw new UIError(500, 'Rejected interval capture due to stopped tracker');

    try {

      // Get properties of current user account
      const currentUser = await Authentication.getCurrentUser();
      const currentTaskId = this.currentTask.id;

      // Get amount of ticks tracked
      const ticks = (typeof ticksOverride === 'number') ? ticksOverride : this.ticker.ticks;

      // Saving timestamp of this period end (NOW moment)
      let startAt = startAtRaw || this.currentInterval.startedAt;
      let endAt = endAtRaw || new Date();

      // Calculate start date using few conditions
      if (

        // If current tick start date is not set (race condition or some other scrapy reason)
        (!startAt || typeof startAt !== 'object' || typeof startAt.getTime !== 'function')

        // If delta between interval start & stop too large
        || (endAt.getTime() - startAt.getTime() > ((ticks + 2) * 1000))

        // Pause detected during this interval
        || this.currentInterval.everPaused

      ) {

        // In case if we can't be sure that currentInterval.startAt value is correct
        // we calculate it by subtraction ticks from Date.now()
        startAt = new Date(endAt.getTime() - (ticks * 1000));

      }

      // Check interval duration
      if (ticks === 0 || (endAt - startAt) < 1000) {

        log.warning('Ignore capture for interval less than 1 second');
        return false;

      }

      // Convert start and stop dates into ISO formatted strings
      startAt = startAt.toISOString();
      endAt = endAt.toISOString();
      log.debug(`Capturing interval: ${startAt} ~ ${endAt} (duration = ${ticks})`);


      // Getting activity metrics, then resetting the counter
      const systemActivity = eventCounter.systemPercentage;
      const keyboardActivity = eventCounter.keyboardPercentage || null;
      const mouseActivity = eventCounter.mousePercentage || null;
      eventCounter.reset();

      // Creating interval object
      const interval = {

        task_id: this.currentTask.externalId,
        start_at: startAt,
        end_at: endAt,
        user_id: currentUser.id,
        activity_fill: systemActivity,
        keyboard_fill: keyboardActivity,
        mouse_fill: mouseActivity,

      };

      // Saving time interval
      await TimeController.saveTrackedTime(this.currentTask.id, ticks);
      log.debug(`Track time is updated (+${ticks} ticks)`);

      // Creating screenshot, if screenshot capture enabled for this user account
      let intervalScreenshot = null;
      if (currentUser.screenshotsEnabled) {

        try {

          // Capture screenshot in the soft-fail manner
          intervalScreenshot = await Screenshot.makeScreenshot();
          log.debug('Screenshot captured');

        } catch (err) {

          log.error('Error occured during screenshot capture for interval', err, true);
          this.emit('screenshot-capture-failed', err);

        }


      }

      // Pushing interval
      try {

        const pushedInterval = await IntervalsController.pushTimeInterval(interval, intervalScreenshot);

        // Hotfix for the scrappy error handling on backend
        if (typeof pushedInterval.id === 'undefined')
          throw new UIError(500, `Interval validation error, between ${startAt} and ${endAt}`);

        log.debug(`Interval was synced (assigned ID is ${pushedInterval.id})`);
        await IntervalsController.pushSyncedIntervalInQueue(interval, intervalScreenshot, pushedInterval.id);

        // Notifies user
        this.emit('interval-pushed', {
          screenshot: intervalScreenshot,
          interval: {
            task: {
              id: currentTaskId,
            },
            remote: pushedInterval,
            duration: ticks,
          },
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

module.exports = new TaskTracker();
