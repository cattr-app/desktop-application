const osIntegration = require('../base/os-integration');
const Logger = require('../utils/log');
const config = require('../base/config');

const log = new Logger('Router:Miscellaneous');
log.debug('Loaded');

module.exports = router => {

  // Handle window controls behavior
  router.serve('window/controls-close', () => osIntegration.windowCloseRequest());

  // Handle minimize icon click
  router.serve('window/controls-minimize', () => osIntegration.windowMinimizeRequest());

  // Set tracker on focus
  router.serve('window/focus', () => osIntegration.windowFocus());

  // Development mode detect
  router.serve('misc/is-indev', req => req.send(200, { indev: config.isDeveloperModeEnabled }));

};
