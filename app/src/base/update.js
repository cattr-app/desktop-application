const { EventEmitter } = require('events');
const axios = require('axios');
const semver = require('semver');
const Log = require('../utils/log');
const configuration = require('./config');
const userPreferences = require('./user-preferences');

const log = new Log('Update');

/**
 * @typedef {Object} UpdateData
 * @property {String} version Update version
 * @property {String} current Current installed version
 * @property {String} downloadsPageUrl URL of downloads page
 */

/**
 * Self-update actions
 */
class Update extends EventEmitter {

  /**
   * Retrieve update data from DL server
   * @async
   * @returns {Promise.<UpdateData|null>} Object with update info if newer version is available, null otherwise
   */
  async retrieveUpdate() {

    // Check is update notifier functionality is enabled in App configuration
    if (!configuration.updateNotification.enabled)
      return null;

    // Check is update notification is not disabled by user
    if (!userPreferences.get('updateNotification'))
      return null;

    // Obtain platform
    let platform = null;
    switch (process.platform) {

      case 'win32': platform = 'windows'; break;
      case 'darwin': platform = 'mac'; break;
      case 'linux': platform = 'linux'; break;
      default:
        log.debug(`unsupported architecture: ${process.platform}`);
        return null;

    }

    try {

      // Retrieve manifest, then check its structure
      const manifestReq = await axios.get(configuration.updateNotification.manifestBaseUrl);
      if (manifestReq.status !== 200 || !manifestReq.data?.name)
        return null;

      const manifestVersion = manifestReq.data.name.replace('v', '');

      // Filer incorrect, older, or current version
      if (configuration.packageVersion === 'dev' || !semver.valid(manifestVersion) || semver.lte(manifestVersion, configuration.packageVersion))
        return null;

      const updateData = {
        version: manifestVersion,
        current: configuration.packageVersion,
        downloadsPageUrl: configuration.updateNotification.downloadsPageUrl,
      };

      this.emit('update-available', updateData);
      return updateData;

    } catch (err) {

      log.error('Error occured during update manifest retrival', err);
      return null;

    }

  }

}

module.exports = new Update();
