const EventEmitter = require('events');

/**
 * Ticker
 * @extends EventEmitter
 */
class Ticker extends EventEmitter {

  /**
   * Current ticks amount
   * @return {Number} Amount of tracked ticks
   */
  get ticks() {

    return this._ticks;

  }

  /**
   * Returns timer current status
   * @return {Boolean} True, if timer is active, false otherwise
   */
  get status() {

    return (this._active === true);

  }

  /**
   * Is timer paused?
   * @return {Boolean} True, if so
   */
  get paused() {

    return (this._paused === true);

  }

  /**
   * Creates ticker
   * @param {String} id Value to identify the ticker
   */
  constructor() {

    super();

    /**
     * Is ticker active now?
     * @type {Boolean}
     */
    this._active = false;

    /**
     * Amount of ticks counted from last reset
     * @type {Number}
     */
    this._ticks = 0;

    /**
     * Is ticker paused for now?
     * @type {Boolean}
     */
    this._paused = false;

    /**
     * If timer resume is requested?
     * @type {Boolean}
     */
    this._resumeRequested = false;

    /**
     * Unix time of last registered tick
     * @type {Number}
     */
    this._lastRegisteredTick = 0;

  }

  /**
   * Starts the ticker
   * @return {Boolean} True, if succeed
   */
  start() {

    if (this._active)
      return false;

    // Emit event
    this.emit('start');

    // Set activity flag
    this._active = true;

    // Create ticker timer instance
    this._counter = setInterval(() => {

      // Handling pause feature
      if (this._paused || this._resumeRequested) {

        // Register tick and exit
        this._lastRegisteredTick = Date.now();

        // Skip tick iteration if we're still on pause
        if (!this._resumeRequested)
          return;

        // Unset flags if resume is requested
        this._paused = false;
        this._resumeRequested = false;

      }

      // Calculate time difference between ticks if there is at least one timer tick behind
      if (this._lastRegisteredTick !== 0) {

        // Calculate difference (in case of some system lags and CPU full load)
        const diff = Math.round((Date.now() - this._lastRegisteredTick) / 1000);

        // If there is any significant difference - apply the ticks diff
        if (diff > 1)
          this._ticks += diff;

      }

      // Increment the ticker
      this._ticks += 1;

      // Emit event
      this.emit('tick');

      // Update last tick timestamp
      this._lastRegisteredTick = Date.now();

    }, 1000);

    return true;

  }

  /**
   * Resets the timer counters
   */
  reset() {

    // Reset ticks amount
    this._ticks = 0;

    // Reset last tick timestamp
    this._lastRegisteredTick = 0;

    // Emitting reset event
    this.emit('reset-counter');

  }

  /**
   * Pauses ticker
   */
  pause() {

    this.emit('pause');
    this._paused = true;

  }

  /**
   * Resuming ticker
   */
  resume() {

    this.emit('resume');
    this._resumeRequested = true;

  }

  /**
   * Stops ticker
   * @param {Boolean} resetSwitcher Switcher to determine whether to reset ticks to zero or not
   */
  stop(resetSwitcher = false) {

    // Stops the ticker
    if (typeof this._counter !== 'undefined')
      clearInterval(this._counter);

    // Unset activity flag
    this._active = false;

    // Unset pause flag
    this._paused = false;

    // Reset last tick timestamp
    this._lastRegisteredTick = 0;

    // Resets the counter if it's requested
    if (resetSwitcher) {

      this._ticks = 0;
      this.emit('reset-counter');

    }

    // Emitting stop event
    this.emit('stop');

  }

}

module.exports = { Ticker };
