const Logger = require('../utils/log');
const config = require('../base/config');
const update = require('../base/update');
const osIntegration = require('../base/os-integration');
const trackingFeatures = require('../controller/tracking-features');
const {Property} = require('../models').db.models;
const api = require('../base/api');
const OfflineMode = require('../base/offline-mode');
const TrackingFeatures = require('../controller/tracking-features');
const auth = require("../base/authentication");

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

  router.serve('misc/get-tracking-features', async req => {
    const features = await trackingFeatures.getCurrentFeatures();
    return req.send(200, {features});
  })

  TrackingFeatures.on('features-changed', features => {
    router.emit('misc/features-changed', features);
  })
  router.serve('misc/update-tracking-features', async req => {
    await auth.getCurrentUser(true);
    return req.send(200, {});
  });

  // Handle unacknowledged tracking features poll request
  router.serve('misc/unacknowledged-tracking-features', async req => {

    const features = await trackingFeatures.retrieveUnacknowledged();
    return req.send(200, {features});

  });

  router.serve('offline-sync/get-public-key', async req => {
    const key = await Property.findOne({where: {key: 'offline-sync_public-key'}});

    if (!key && !OfflineMode.enabled) {
      try {
        const publicKey = await api.offlineSync.getPublicKey();
        const newEntry = new Property({key: 'offline-sync_public-key', value: publicKey});
        await newEntry.save();
        return req.send(200, {key: newEntry.value})
      } catch (error) {
        error.context = {};
        const crypto = require("crypto");
        error.context.client_trace_id = crypto.randomUUID();

        log.error('Error occurred during offline-sync encryption key fetching', error);
        return req.send(500, {
            message: 'Error occurred during offline-sync encryption key fetching',
            error: JSON.parse(JSON.stringify(error)),
          }
        );
      }
    } else if (!key && OfflineMode.enabled) {
      return req.send(500, {
        message: `In order to export intervals, Cattr client app needs to fetch encryption keys from the server first.`,
      });
    }


    return req.send(200, {key: key.value})
  });

};
