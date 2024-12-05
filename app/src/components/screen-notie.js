const notie = require('../utils/notifier');
const tracker = require('../base/task-tracker');
const Logger = require('../utils/log');
const osIntegration = require('../base/os-integration');
const userPreferences = require('../base/user-preferences');
const EMPTY_IMAGE = require('../constants/empty-screenshot');

const log = new Logger('Screen-Notifier');

tracker.on('interval-pushed', data => {

  // Do not show notie is application is about to quit or application window is not exists
  if (
    osIntegration.isApplicationClosingNow
    || !osIntegration.window
    || !userPreferences.get('showScreenshotNotification')
    || data.deferred === true
  )
    return;

  // Check is screenshot exists
  if (data.screenshot) {
    notie.screenshotNotification(data.screenshot, data.interval);
  } else {
    notie.screenshotNotification(EMPTY_IMAGE, data.interval);
  }

});

log.debug('Loaded');
