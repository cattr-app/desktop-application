const path = require('path');
const {
  BrowserWindow, Notification, screen, ipcMain, nativeImage,
} = require('electron');
const IPCRouter = require('@amazingcat/electron-ipc-router');
const timeIntervalController = require('../controller/time-intervals');
const userPreferences = require('../base/user-preferences');
const translation = require('../base/translation');
const TaskTracker = require('../base/task-tracker');
const config = require('../base/config');
const Log = require('./log');

const log = new Log('Notifier');
const notificationRouter = new IPCRouter(ipcMain, 'screenshot-notie');

/**
 * BrowserWindow of the current notification
 * @type {BrowserWindow|null}
 */
let notificationBrowserWindow = null;

/**
 * Removes time interval
 * @param {Object} interval Interval to delete
 */
const removeTimeInterval = async interval => {

  try {

    // Request for delete
    if (interval.remote._isBackedUp)
      await timeIntervalController.removeInterval(interval.remote.dataValues.id, { remoteIdentifier: false });
    else
      await timeIntervalController.removeInterval(interval.remote.id, { remoteIdentifier: true });

    // Emitting event
    TaskTracker.emit('interval-removed', interval);


  } catch (error) {

    // Log error
    log.error('Error during interval delete from notification', error);

  }

};

// Display BrowserWindow notification
notificationRouter.serve('notification/display', () => notificationBrowserWindow.showInactive());

// Delete interval from BrowserWindow notification
notificationRouter.serve('notification/delete', async request => removeTimeInterval(request.packet.body.interval));

// Destroy BrowserWindow notification
notificationRouter.serve('notification/destroy', () => {

  notificationBrowserWindow.destroy();
  notificationBrowserWindow = null;

});

/**
 * Show macOS notification
 * @param {Buffer} screenshot Captured screenshot
 * @param {Object} interval   Properties of the captured inteval
 */
const showSystemNotification = async (screenshot, interval) => {

  // Create notification content
  const notify = new Notification({
    silent: true,
    hasReply: false,
    urgency: 'normal',
    timeoutType: 'default',
    title: translation.translate('Cattr'),
    icon: nativeImage.createFromBuffer(screenshot),
    closeButtonText: translation.translate('Close'),
    body: translation.translate('Screenshot captured'),
    actions: [{ type: 'button', text: translation.translate('Delete') }],
  });

  // Close notification automatically
  let timerId = setTimeout(() => notify.close(), userPreferences.get('screenshotNotificationTime') * 1000);

  // Handle "screenshot remove" action
  const actionHandler = process.platform === 'darwin' ? 'action' : 'click';
  notify.on(actionHandler, (action, index) => {

    clearTimeout(timerId);
    notify.close();

    if (index === 0) {

      removeTimeInterval(interval);

      const removalNotification = new Notification({
        silent: true,
        hasReply: false,
        title: translation.translate('Cattr'),
        icon: nativeImage.createFromBuffer(screenshot),
        closeButtonText: translation.translate('Close'),
        body: translation.translate('Screenshot deleted!'),
      });

      removalNotification.show();
      timerId = setTimeout(() => removalNotification.close(), 2000);

    }

  });

  // Show notification
  notify.show();

};

/**
 * Show BrowserWindow notification
 * @param  {Buffer}   screenshot  Screenshot binary content
 * @param  {String}   interval    Properties of the captured interval
 */
const showBrowserNotification = async (screenshot, interval) => {

  // Get active screen
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());

  // Calculate notie dimensions (1/6 of screen size on both axis)
  // const width = Math.round(display.workAreaSize.width / 5);
  const width = Math.round(display.workAreaSize.width / 7);
  const height = Math.round(display.workAreaSize.height / 7);

  // Calculate notie positioning
  const posX = display.workArea.x + display.workArea.width - width;
  const posY = display.workArea.y + display.workArea.height - height;

  // Configure notification window
  const windowOptions = {

    width,
    height,
    x: posX,
    y: posY,
    resizable: false,
    movable: false,
    frame: false,
    show: false,
    focusable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: false,
      contextIsolation: false,
    },
    transparent: true,

  };

  // Destroy ongoing notification if it's still active
  if (notificationBrowserWindow)
    notificationBrowserWindow.destroy();

  // Create new window
  notificationBrowserWindow = new BrowserWindow(windowOptions);

  // Render the notie template
  notificationBrowserWindow.loadURL('file://'.concat(path.resolve(config.apppath, 'build', 'screen-notie.html')));

  // Pass webContents to the router instance
  notificationRouter.setWebContents(notificationBrowserWindow.webContents);

  // Send a screenshot and interval when window become ready
  notificationBrowserWindow.webContents.on('dom-ready', async () => {

    // Send screenshot to FE
    notificationRouter.emit('notification/screenshot', { screenshot: screenshot.toString('base64'), interval });

    // Send duration
    notificationRouter.emit('notification/duration', { duration: userPreferences.get('screenshotNotificationTime') * 1000 });

    // Send translations
    notificationRouter.emit('notification/translation', {
      body: translation.translate('Screenshot captured'),
      close: translation.translate('Close'),
      delete: translation.translate('Delete'),
    });

  });

  // Generate and inject CSP policy
  notificationBrowserWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {

    // Build a CSP and apply the default policy
    let cspValue = "default-src 'self';";

    // Apply assets policy
    cspValue += "style-src 'self' data: 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:;";

    // Scripts: allow unsafe-eval in dev mode, otherwise Chrome DevTools wouldn't work
    if (config.isDeveloperModeEnabled)
      cspValue += "script-src 'self' 'unsafe-eval' 'unsafe-inline';";
    else
      cspValue += "script-src 'self' 'unsafe-inline';";

    // If Sentry is enabled, inject also a connect-src CSP allowing requests to Sentry host
    if (config.sentry.enabled && userPreferences.get('errorReporting')) {

      // Parse frontend's DSN to extract the host
      const frontendDsnUrl = new URL(config.sentry.dsnFrontend);

      // Inject connect-src policy allowing connections to self and Sentry hostname
      cspValue += `connect-src 'self' ${frontendDsnUrl.origin};`;

    }

    // Returning injection by callback
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': cspValue,
      },
    });

  });

};

/**
 * Shots screenshot notification
 * @param  {Buffer}   screenshot  Screenshot binary content
 * @param  {String}   interval    Properties of the captured interval
 */
module.exports.screenshotNotification = async (screenshot, interval) => {

  // Send native notifications on macOS
  if (process.platform === 'darwin' && Notification.isSupported())
    showSystemNotification(screenshot, interval);
  else
    showBrowserNotification(screenshot, interval);

  return true;

};
