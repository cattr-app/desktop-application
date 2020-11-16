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
 * Removes time interval
 * @param {Object} interval Interval to delete
 */
const removeTimeinterval = async interval => {

  try {

    // Request for delete
    await timeIntervalController.destroyInterval(interval.remote.id);

    // Emitting event
    TaskTracker.emit('interval-removed', interval);


  } catch (error) {

    // Log error
    log.error('Error during interval delete from notification', error);

  }

};

// Interval delete handler
notificationRouter.serve('notification/delete', async request => removeTimeinterval(request.packet.body.interval));


module.exports = {

  showDevTools: false,

  /**
   * Show system notification
   * @param {Buffer} screenshot Captured screenshot
   * @param {Object} interval   Properties of the captured inteval
   */
  async screenshotSystemNotification(screenshot, interval) {

    const notify = new Notification({
      title: translation.translate('Cattr'),
      body: translation.translate('Screenshot captured'),
      silent: true,
      icon: nativeImage.createFromBuffer(screenshot),
      hasReply: false,
      closeButtonText: translation.translate('Close'),
      urgency: 'normal',
      timeoutType: 'default',
      actions: [
        {
          text: translation.translate('Delete'),
          type: 'button',
        },
      ],
    });

    let timerId = 0;

    const actionHandler = process.platform === 'darwin' ? 'action' : 'click';

    notify.on(actionHandler, (action, index) => {

      clearTimeout(timerId);
      notify.close();

      if (index === 0) {

        removeTimeinterval(interval);

        const _notify = new Notification({
          title: translation.translate('Cattr'),
          body: translation.translate('Screenshot deleted!'),
          silent: true,
          icon: nativeImage.createFromBuffer(screenshot),
          hasReply: false,
          closeButtonText: translation.translate('Close'),
        });
        _notify.show();
        timerId = setTimeout(() => _notify.close(), 2000);

      }

    });

    notify.show();
    timerId = setTimeout(() => notify.close(), userPreferences.get('screenshotNotificationTime') * 1000);

  },

  /**
   * Shots screenshot notification
   * @param  {Buffer}   screenshot  Screenshot binary content
   * @param  {String}   interval    Properties of the captured interval
   */
  async screenshotNotification(screenshot, interval) {

    // Send native notifications on macOS
    if (process.platform === 'darwin' && Notification.isSupported()) {

      this.screenshotSystemNotification(screenshot, interval);
      return;

    }

    // Get active screen
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());

    // Calculate notie dimensions (1/6 of screen size on both axis)
    // const width = Math.round(display.workAreaSize.width / 5);
    const width = 384;
    const height = 100;

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
        enableRemoteModule: true,
      },
      transparent: true,

    };

    // Create new window
    const notification = new BrowserWindow(windowOptions);

    // Render the notie template
    notification.loadURL('file://'.concat(path.resolve(config.apppath, 'build', 'screen-notie.html')));

    // Pass webContents to the router instance
    notificationRouter.setWebContents(notification.webContents);

    // Send a screenshot and interval when window become ready
    notification.webContents.on('dom-ready', async () => {

      // Send screenshot to FE
      notificationRouter.emit('notification/screenshot', { screenshot: screenshot.toString('base64'), interval });

      // Send duration
      notificationRouter.emit('notification/duration', {
        duration: userPreferences.get('screenshotNotificationTime') * 1000,
      });

      // Send translations
      notificationRouter.emit('notification/translation', {
        body: translation.translate('Screenshot captured'),
        close: translation.translate('Close'),
        delete: translation.translate('Delete'),
      });

    });

  },

};
