const Log = require('./log');
const Company = require('../base/api').company;

const log = new Log('HeartbeatMonitor');

class HeartbeatMonitor {

  constructor() {

    /**
     * Identifier of the heartbeating interval
     * @type {Number|null}
     */
    this.heartbeat = null;

    /**
     * Heartbeat interval in seconds
     * @type {Number|null}
     */
    this.heartbeatInterval = null;

  }

  /**
   * Return current status of the monitor (i.e., is it active)
   * @type {Boolean}
   */
  get isActive() {

    return this.heartbeat !== null;

  }

  /**
   * Fetch a delay between heartbeats from the remote origin
   * @async
   */
  async fetchHeartbeatInterval() {

    let interval = 0;
    try {

      interval = await Company.heartbeatInterval();

    } catch (err) {

      log.error('HB000', `Cannot get a heartbeat interval from remote, falling back to 30s: ${err}`);
      interval = 30;

    }

    // Converting to milliseconds
    this.heartbeatInterval = (interval || 30) * 1000;

  }

  /**
   * Send a heartbeat request to remote
   * @async
   * @returns {Promise.<Boolean>} Is beat successfull or not
   */
  static async beat() {

    try {

      await Company.heartBeat();
      return true;

    } catch (error) {

      log.error('HB001', `Error occured during heartbeating: ${error}`, true);
      return false;

    }

  }

  /**
   * Starts the heartbeat monitor
   * @async
   */
  async start() {

    // Allow only one instance of the monitor at a time
    if (this.isActive)
      return;

    // Request a heartbeat interval from remote if it is not cached locally yet
    if (!this.heartbeatInterval)
      await this.fetchHeartbeatInterval();

    // Setting a new heartbeater, which self-deactivates in case of failure
    this.heartbeat = setInterval(async () => await HeartbeatMonitor.beat() || this.stop(), this.heartbeatInterval);

    // Debug
    log.debug(`Heartbeat activated! Heartbeat interval is ${this.heartbeatInterval / 1000}s`);

  }

  /**
   * Stops the heartbeat monitor
   */
  stop() {

    if (!this.heartbeat)
      return;

    clearInterval(this.heartbeat);
    log.debug('Heartbeat deactivated');
    this.heartbeat = null;

  }

}

module.exports = new HeartbeatMonitor();
