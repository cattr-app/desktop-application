const Translation = require('../base/translation');
const Logger = require('../utils/log');

const log = new Logger('Router:Trasnlation');
log.debug('Loaded');

module.exports = router => {

  // Handle translation request
  router.serve('translation/get-configuration', r => r.send(200, { configuration: Translation.getConfiguration() }));

};
