const Logger = require('../utils/log');
const config = require('../base/config');
const update = require('../base/update');
const osIntegration = require('../base/os-integration');
const trackingFeatures = require('../controller/tracking-features');

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

  // Handle update notification request
  router.serve('misc/update-available', async req => {

    const version = await update.retrieveUpdate();
    return req.send(200, version || { version: null });

  });

  // Handle unacknowledged tracking features poll request
  router.serve('misc/unacknowledged-tracking-features', async req => {

    const features = await trackingFeatures.retrieveUnacknowledged();
    return req.send(200, { features });

  });

};
