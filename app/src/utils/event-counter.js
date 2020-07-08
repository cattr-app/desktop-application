const { powerMonitor } = require('electron');

class EventCounter {

  constructor() {

    /**
     * IOHook instance
     * @type {IOHook|null}
     */
    this.iohook = null;

    // Use iohook only on Windows & Linux due to enormous amount of issues
    // with event tracking on macOS
    // Temporarly this will disable iohook on all platforms due to many internal issues
    if (process.platform !== 'darwin' && process.platform !== 'linux' && process.platform !== 'win32') {

      // eslint-disable-next-line global-require
      this.iohook = require('../libs/iohook');

      this.iohook.on('keydown', () => {

        this.keyboardActiveDuringThisSecond = true;

      });

      this.iohook.on('mousemove', () => {

        this.keyboardActiveDuringThisSecond = true;

      });

      this.iohook.on('mousewheel', () => {

        this.mouseActiveDuringThisSecond = true;

      });

      this.iohook.on('mousedown', () => {

        this.mouseActiveDuringThisSecond = true;

      });

    }

    /**
     * Overall interval duration
     * @type {Number}
     */
    this.intervalDuration = 0;

    /**
     * Amount of seconds with detected activity
     * @type {Object}
     */
    this.activeSeconds = {
      keyboard: 0,
      mouse: 0,
      system: 0,
    };

    /**
     * Identifier of the corresponding setInterval
     * @type {Number|null}
     */
    this.intervalId = null;

    /**
     * Identifier of powerMonitor detector setInterval
     * @type {Number|null}
     */
    this.detectorIntervalId = null;

    /**
     * Flag representing mouse activity detection during this second
     * @type {Boolean}
     */
    this.mouseActiveDuringThisSecond = false;

    /**
     * Flag representing keyboard activity detection during this second
     * @type {Boolean}
     */
    this.keyboardActiveDuringThisSecond = false;

    /**
     * Flag representing system activity detection during this second
     * @type {Boolean}
     */
    this.systemActiveDuringThisSecond = true;

  }

  /**
   * Percentage of keyboard activity time
   * @type {Number}
   */
  get keyboardPercentage() {

    // Avoid Infinity in results
    if (this.intervalDuration === 0 || this.activeSeconds.keyboard === 0)
      return 0;

    return Math.ceil(this.activeSeconds.keyboard / (this.intervalDuration / 100));

  }

  /**
   * Percentage of mouse activity time
   * @type {Number}
   */
  get mousePercentage() {

    // Avoid Infinity in results
    if (this.intervalDuration === 0 || this.activeSeconds.mouse === 0)
      return 0;

    return Math.ceil(this.activeSeconds.mouse / (this.intervalDuration / 100));

  }

  /**
   * Percentage of system reported activity time
   * @type {Number}
   */
  get systemPercentage() {

    // Avoid Infinity in results
    if (this.intervalDuration === 0 || this.activeSeconds.system === 0)
      return 0;

    return Math.ceil(this.activeSeconds.system / (this.intervalDuration / 100));

  }

  /**
   * Starts event tracking & counting
   */
  start() {

    if (this.intervalId)
      throw new Error('This instance of EventCounter is already started');

    // Set counting interval
    this.intervalId = setInterval(() => {

      this.intervalDuration += 1;

      if (this.keyboardActiveDuringThisSecond)
        this.activeSeconds.keyboard += 1;

      if (this.mouseActiveDuringThisSecond)
        this.activeSeconds.mouse += 1;

      if (
        this.mouseActiveDuringThisSecond
        || this.keyboardActiveDuringThisSecond
        || this.systemActiveDuringThisSecond
      )
        this.activeSeconds.system += 1;

      this.keyboardActiveDuringThisSecond = false;
      this.mouseActiveDuringThisSecond = false;
      this.systemActiveDuringThisSecond = false;

    }, 1000);

    // Load IOHook native module
    if (this.iohook)
      this.iohook.load();

    else {

      this.detectorIntervalId = setInterval(() => {

        if (powerMonitor.getSystemIdleTime() === 0)
          this.systemActiveDuringThisSecond = true;

      }, 1000);

    }

  }

  /**
   * Stops event tracker
   */
  stop() {

    if (!this.intervalId)
      throw new Error('Event counter is not active');

    // Resetting counters, flags, and identifiers
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.keyboardActiveDuringThisSecond = false;
    this.mouseActiveDuringThisSecond = false;
    this.activeSeconds.keyboard = 0;
    this.activeSeconds.mouse = 0;
    this.activeSeconds.system = 0;
    this.intervalDuration = 0;

    this.keyboardActiveDuringThisSecond = false;
    this.mouseActiveDuringThisSecond = false;
    this.systemActiveDuringThisSecond = true;

    if (this.detectorIntervalId) {

      clearInterval(this.detectorIntervalId);
      this.detectorIntervalId = null;

    }

    // Unload IOHook
    if (this.iohook)
      this.iohook.unload();

  }

  /**
   * Resets the counters
   */
  reset() {

    this.activeSeconds.keyboard = 0;
    this.activeSeconds.mouse = 0;
    this.activeSeconds.system = 0;
    this.intervalDuration = 0;

    this.keyboardActiveDuringThisSecond = false;
    this.mouseActiveDuringThisSecond = false;
    this.systemActiveDuringThisSecond = true;

  }

}

module.exports = new EventCounter();
