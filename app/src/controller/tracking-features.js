const { EventEmitter } = require('events');
const { Property } = require('../models').db.models;
const Log = require('../utils/log');

const log = new Log('TrackingFeatures');
const ScreenshotsState = require("../constants/ScreenshotsState");

class TrackingFeatures extends EventEmitter {

  /**
   * Retrieves a list of tracking features from User
   * @param {User} user
   * @returns {string[]} Array of monitoring featuers
   */
  static parseUserFeatures(user) {

    const features = [];

    if (user.appMonitoringEnabled) {

      if (process.platform === 'win32')
        features.push('APP_MONITORING');
      else
        log.warning('App monitoring isn\'t supported on platforms other then Windows');

    }

    if (user.screenshotsState === ScreenshotsState.REQUIRED || user.screenshotsState === ScreenshotsState.OPTIONAL) {
      features.push('DESKTOP_SCREENSHOTS');
    } else {
      features.push('DESKTOP_SCREENSHOTS_DISABLED');
    }

    return features;

  }

  /**
   * Retrieve unacknowledged tracking features list if any
   * @returns {Promise.<null|string[]>} List of unack'ed features, or null
   */
  async retrieveUnacknowledged() {

    const featureListRow = await Property.findOne({ where: { key: 'tracking_features' } });
    if (!featureListRow)
      return null;

    const featureList = JSON.parse(featureListRow.value);

    if (featureList.acknowledged)
      return null;

    // Update acknowledge flag in the database
    featureList.acknowledged = true;
    featureListRow.value = JSON.stringify(featureList);
    await featureListRow.save();

    this.emit('acknowledged');
    return featureList.features;

  }

  /**
   * Update features from User entry
   * @param {User} user
   * @param {Boolean} [acknowledged=false] Acknowledge changes on update
   * @returns {Promise.<null|string[]>} List of new features if any
   */
  async updateFromUser(user, acknowledged = false) {

    // Retrieve feature lists from DB and user
    const userFeatures = TrackingFeatures.parseUserFeatures(user);
    const dbFeaturesRow = await Property.findOne({ where: { key: 'tracking_features' } });

    // If there is no feature list in persistence, create a new one
    if (!dbFeaturesRow) {

      // Create a new database property
      const flProperty = new Property({
        key: 'tracking_features',
        value: JSON.stringify({
          acknowledged,
          features: userFeatures,
        }),
      });

      // Save it
      await flProperty.save();

      // Reflect changes in the log file
      log.debug(`Created a new tracking features list: ${userFeatures}`);

      // Consider all features as new ones
      this.emit('features-changed', userFeatures);
      return userFeatures;

    }

    const dbFeatures = JSON.parse(dbFeaturesRow.value);

    // Find new features
    const newFeatures = userFeatures.filter(f => !dbFeatures.features.includes(f));

    // Detect difference between feature lists
    const isFeatureListsDifferent = userFeatures

      // Get the left hand outer selection
      .filter(f => !dbFeatures.features.includes(f))

      // Get the right hand outer selection
      .concat(dbFeatures.features.filter(f => !userFeatures.includes(f)))

      // Convert to boolean
      .length > 0;

    // Update database entry
    dbFeaturesRow.value = JSON.stringify({
      features: userFeatures,
      acknowledged: acknowledged || !isFeatureListsDifferent,
    });
    await dbFeaturesRow.save();

    // Reflect changes in the log file
    log.debug(`Update tracking features list: ${userFeatures}`);

    // Notify application about new set of tracking features
    if (newFeatures.length > 0) {

      this.emit('features-changed', newFeatures);
      return newFeatures;

    }

    return null;

  }

  /**
   * Get list of active tracking features
   * @async
   * @returns {Promise.<string[]|null>}
   */
  async getCurrentFeatures() {

    const featureListRow = await Property.findOne({ where: { key: 'tracking_features' } });
    if (!featureListRow)
      return null;

    const featureList = JSON.parse(featureListRow.value);
    this.emit('fetched', featureList.features);
    return featureList.features;

  }

}

module.exports = new TrackingFeatures();
