const EventEmitter = require('events');
const auth = require('./authentication');
const Log = require('../utils/log');

const log = new Log('OfflineMode');

class OfflineModeHandler extends EventEmitter {

  /**
   * Returns status of offline mode (true if enabled)
   * @return {Boolean} Is offline mode enabled?
   */
  get enabled() {

    return this._isEnabled;

  }

  /**
   * Builds the class
   */
  constructor() {

    super();

    /**
     * Status of the offline mode
     * @type {Boolean}
     */
    this._isEnabled = false;

    /**
     * Identifier of the server ping timer
     * @type {Number|null}
     */
    this._pingTimer = null;

    /**
     * Check server connectivity each 30 sec
     * @type {Number}
     * @constant
     */
    this._PING_TIMER_INTERVAL = 30 * 1000;

  }

  /**
   * Triggers offline mode on
   */
  trigger() {

    // Ignore repeats
    if (this._isEnabled)
      return;

    // Turn offline mode on
    log.debug(`Offline mode is triggered, checking connectivity each ${this._PING_TIMER_INTERVAL} ms`);
    this._isEnabled = true;

    // Notify that offline mode is enabled
    this.emit('offline');

    // Set connectivity check timer
    this._pingTimer = setInterval(async () => {

      // Check connectivity
      const serverStatus = await auth.ping();

      // Connection is not restored
      if (!serverStatus)
        return log.debug('Connection still not restored');

      // Call offline mode restore routine
      await this.restore();

    }, this._PING_TIMER_INTERVAL);

  }


  /**
   * Cancels offline mode
   */
  async restore() {

    if (!this._isEnabled)
      return;

    // Connection restored
    log.debug('Connection restored');

    // Reset timer
    clearInterval(this._pingTimer);
    this._pingTimer = null;

    // Reset state
    this._isEnabled = false;

    // Emit reconnection event
    this.emit('connection-restored');

  }

  /**
   * Disarm offline mode if server is available
   */
  async restoreWithCheck() {

    if (!this._isEnabled)
      return;

    // Check connectivity
    if (await auth.ping())
      return this.restore();

    return false;

  }

}

/**
 * Exports single instance of OfflineModeHander
 * @type {OfflineModeHandler}
 */
module.exports = new OfflineModeHandler();
