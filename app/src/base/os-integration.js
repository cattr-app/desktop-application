const { app, systemPreferences } = require('electron');
const EventEmitter = require('events');
const Log = require('../utils/log');
const Tracker = require('./task-tracker');
const userPreferences = require('./user-preferences');

const log = new Log('OSIntegration');

/**
 * @typedef   {Object}   TrackingAvailabilityStatus
 * @property  {Boolean}  available                   True, if we can track, false otherwise
 * @property  {String}   reason                      Reason why tracking is not available
 *
 * Possible "reason" parameter values:
 *  - "macos_no_accessibility_permissions" — Accessibility permissions is not granted in macOS
 *  - "wayland_is_not_supported" — Application runs on Wayland which we are not supporting yet
 */


/**
 * Integrations with OS
 */
class OSIntegration extends EventEmitter {

  /**
   * Initialises internal variables
   */
  constructor() {

    // Inherit EventEmitter's props
    super();

    /**
     * Target browser window
     * @type {BrowserWindow|null}
     */
    this._window = null;

    /**
     * @type {boolean}
     * @private
     */
    this._hideWindowInsteadClose = true;

    this._windowIsHidden = false;

  }

  /**
   * Primary application window
   * @type {BrowserWindow}
   */
  get window() {

    return this._window;

  }

  /**
   * Is gracefull exit procedure started
   * @type {Boolean}
   */
  get isApplicationClosingNow() {

    return this._exitActivityStatus;

  }

  /**
   * Initialises OSIntegration with the window instance
   * @param  {BrowserWindow} targetWindow Electron's BrowserWindow instance
   */
  init(targetWindow) {

    // Link targetWindow with internal variable
    this._window = targetWindow;

    // Emit event
    this.emit('window-is-set');

    // Nulling the window object when window is closed
    this._window.on('closed', () => {

      this._window = null;

    });

    // Catch WebContents ready
    this._window.once('did-finish-load', () => this.webContentsReady());

    // Handle application quit
    this._window.on('close', async event => this._windowClose(event));

    this._window.on('hide', () => {

      this._hideWindowInsteadClose = false;
      this._windowIsHidden = true;

    });

    this._window.on('show', () => {

      this._hideWindowInsteadClose = true;
      this._windowIsHidden = false;

    });

    this._window.on('minimize', () => {

      if (!userPreferences.get('hideInsteadClose'))
        this._window.hide();

    });

    this._window.on('restore', () => this._window.show());

    if (process.platform === 'darwin')
      app.on('activate', () => this.windowFocus());

    // Catch SIGINT (Ctrl+C close in terminal)
    process.on('SIGINT', async e => (this._exitActivityStatus ? null : this.gracefullExit(e)));
    process.on('SIGTERM', async e => (this._exitActivityStatus ? null : this.gracefullExit(e)));

  }

  /**
   * Close application
   * @param  {Object}        event  Various kinds of application close events
   * @return {Promise<Void>}        Nothing
   * @private
   */
  async _windowClose(event) {

    if (this._exitActivityStatus === true)
      return;

    event.returnValue = false; // eslint-disable-line no-param-reassign
    event.preventDefault();

    if (userPreferences.get('hideInsteadClose') && this._hideWindowInsteadClose && event && event.preventDefault) {

      this._window.hide();
      this.windowSkipTaskbar(true);

    } else
      this.gracefullExit();

  }

  /**
   * Closes application gracefully
   * @return {Promise<Void>} Nothing
   */
  async gracefullExit() {

    if (this._exitActivityStatus === true) {

      log.debug('Forced exit procedure started');
      this._hideWindowInsteadClose = false;
      process.exit();
      return;

    }

    this._exitActivityStatus = true;
    this._hideWindowInsteadClose = false;

    log.debug('Gracefull exit procedure started');
    this.emit('window-close-requested');

    // Stopping the tracker
    if (Tracker.active) {

      log.debug('Tracker is running, stopping');
      await Tracker.stop();
      log.debug('Tracker stopped');

    }

    log.debug('Goodby.');
    Log._closeLogStream();
    app.quit();

  }

  /**
   * Executes when the main window WebContents become ready
   */
  webContentsReady() {

    // Fire corresponding event
    this.emit('window-webcontents-ready', this._window.webContents);

  }

  /**
   * Handles window close control button
   */
  windowCloseRequest() {

    // Ignore this if window is not defined
    if (!this._window)
      return;
    this.gracefullExit();

  }

  /**
   * Minimize window to taskbar
   */
  windowMinimizeRequest() {

    // Minimize application in tray
    this._window.minimize();

  }

  /**
   * Hide window
   */
  windowHideRequest() {

    this.windowSkipTaskbar(true);
    this._window.hide();
    this._windowIsHidden = true;

  }

  /**
   * Handle window focus request
   */
  windowFocus() {

    // Show window if it hide
    this._window.show();
    this._windowIsHidden = false;

    // Show in taskbar
    this.windowSkipTaskbar(false);

    // Restore window if it is minified
    this._window.restore();

    // Focus on the main window
    this._window.focus();

  }

  /**
   * Set window skip taskbar
   * @param {Boolean}  skip  Hide taskbar or not
   */
  windowSkipTaskbar(skip) {

    this._window.setSkipTaskbar(skip);

  }

  /**
   * Check window is minimized
   * @return {boolean} Is minimized or not
   */
  windowIsMinimized() {

    return this._window.isMinimized() || this._windowIsHidden;

  }

  /**
   * Can we track activity on this system?
   * @return {Promise<TrackingAvailabilityStatus>} Tracking availability status
   */
  static async getTrackingAvailability() {

    if (process.platform === 'darwin') {

      // (macOS) Check is the accessibility permissions granted?
      if (!systemPreferences.isTrustedAccessibilityClient(true)) {

        log.warning('We don\'t have an accessibility permissions');
        return { available: false, reason: 'macos_no_accessibility_permissions' };

      }

    } else if (process.platform === 'linux') {

      // (linux) Check is Wayland is active?
      if (process.env.XDG_SESSION_TYPE && process.env.XDG_SESSION_TYPE === 'wayland') {

        log.warning('Wayland is not supported for tracking yet');
        return { available: false, reason: 'wayland_is_not_supported' };

      }

    }

    return { available: true };

  }

}


// Create primary instance of OSIntegration
module.exports = new OSIntegration();
