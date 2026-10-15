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
   * Retrieve update data from GitHub Releases
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

      // Retrieve the latest GitHub release and extract the version from its tag
      const releaseReq = await axios.get(configuration.updateNotification.latestReleaseUrl);
      if (releaseReq.status !== 200 || typeof releaseReq.data?.tag_name !== 'string')
        return null;

      const releaseVersion = releaseReq.data.tag_name.replace(/^v/, '');

      // Filter invalid, older, or current versions
      if (configuration.packageVersion === 'dev' || !semver.valid(releaseVersion) || semver.lte(releaseVersion, configuration.packageVersion))
        return null;

      const updateData = {
        version: releaseVersion,
        current: configuration.packageVersion,
        downloadsPageUrl: configuration.updateNotification.downloadsPageUrl,
      };

      this.emit('update-available', updateData);
      return updateData;

    } catch (err) {

      log.error('Error occurred during latest release retrieval', err);
      return null;

    }

  }

}

module.exports = new Update();
