const path = require('path');
const { readdirSync: readdir, promises: { unlink } } = require('fs');
const Log = require('../utils/log');
const config = require('../base/config');
const { KEEP_LAST_X_ENTRIES } = require('../constants/log-rotate');

const log = new Log('LogRotate');

// Get list of log files to remove
const filesToRemove = readdir(config.logger.directory)

  // Filter logfiles by stupidly simple signature
  .filter(filename => /^(at).*(\.log)$/.test(filename))

  // Sort it ASC (oldest first)
  .sort()

  // Reverse to DESC
  .reverse()

  // Select all log files older than Nth element
  .slice(KEEP_LAST_X_ENTRIES);

// Remove obsolete logs
if (filesToRemove.length) {

  log.debug(`Removing ${filesToRemove.length} log files`);
  Promise
    .all(filesToRemove.map(async f => unlink(path.resolve(config.logger.directory, f))))
    .then(() => log.debug('Removed'))
    .catch(err => log.error('Error occured during log rotation', err));

}
