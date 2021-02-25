const { EventEmitter } = require('events');
const os = require('os');
const axios = require('axios');
const Company = require('../base/api').company;
const configuration = require('../base/config');
const authentication = require('../base/authentication');
const userPreferences = require('../base/user-preferences');

/**
 * Usage statistics emitter
 * @class
 */
class UsageStatistics extends EventEmitter {

  constructor() {

    super();

    // Waiting until backend connection establishment
    authentication.events.once('user-fetched', () => UsageStatistics.reportStats());

  }

  /**
   * Report usage statistics
   * @async
   * @returns {Promise.<Boolean>} True, if usage report is sent, false otherwise
   */
  static async reportStats() {

    // Skip usage report if usage statistics share is disabled
    if (!configuration.usageStatistics.enabled || !userPreferences.get('usageStatistics'))
      return false;

    try {

      // Get backend installation ID
      const companyAbout = await Company.about();
      if (!companyAbout.app || !companyAbout.app.instance_id)
        return false;

      const usageReport = {
        instanceId: companyAbout.app.instance_id,
        osVersion: os.release(),
        osPlatform: os.platform(),
        appType: 'desktop',
        appVersion: configuration.packageVersion,
      };

      await axios.post(`${configuration.usageStatistics.collectorUrl}/v2/usage-report`, usageReport);
      return true;

    } catch (_) {

      return false;

    }

  }

}

module.exports = new UsageStatistics();
