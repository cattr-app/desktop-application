const Logger = require('../utils/log');
const OfflineMode = require('../base/offline-mode');

const log = new Logger('Router:Offline');
log.debug('Loaded');

module.exports = router => {

  OfflineMode.on('offline', () => router.emit('offline/status', { state: true }));
  OfflineMode.on('connection-restored', () => {
    router.emit('offline/status', { state: false });
    router.emit('misc/set-offline-sync-encryption-key', {});
  });
  router.serve('offline/request-status', req => req.send(200, { state: OfflineMode._isEnabled }));

};
