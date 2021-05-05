const fs = require('fs');
const { EventEmitter } = require('events');
const Logger = require('../utils/log');
const translationsLoader = require('../utils/translations');
const configuration = require('./config');
const Sentry = require('../utils/sentry');

const log = new Logger('UserPreferences');

/**
 * Map between type's name and object
 * @type {Map.<String, Function>}
 */
const TypeNameMap = new Map([
  ['boolean', Boolean],
  ['string', String],
  ['number', Number],
]);

/**
 * Preferences map
 * @type {Object}
 */
const preferences = {

  // Preferences entry for screenshot notification
  showScreenshotNotification: {

    // Preference entry type
    type: 'boolean',

    // Human-readable name for this parameter
    name: 'Show screenshot notification',

    // Human-readable description
    description: 'Should we notify you about captured screenshot?',

    // Default value
    default: true,

    // Frontend configuration for Preferences page
    frontend: {

      // Type of the frontend element
      element: 'toggle',

      // Map between frontend element states and this entry values
      options: { No: false, Yes: true },

    },

  },

  // Preferences entry for screenshot notification
  screenshotNotificationTime: {
    type: 'number',
    name: 'Screenshot notification duration',
    description: 'Duration of notification in seconds',
    default: 5,
    frontend: {
      element: 'number',
      options: { min: 0 },
    },
  },

  // Preferences entry for the inactive tasks display
  showInactiveTasks: {
    type: 'boolean',
    name: 'Display closed tasks',
    description: 'Should we show you inactive (closed) tasks?',
    default: false,
    frontend: {
      element: 'toggle',
      options: { No: false, Yes: true },
    },
  },

  language: {
    type: 'string',
    name: 'Language',
    description: 'Interface language',
    default: 'en',
    frontend: {
      element: 'options',
      options: translationsLoader.languages,
    },
  },

  hideInsteadClose: {
    type: 'boolean',
    name: 'Window close action',
    description: 'Should we close or hide application on window close?',
    default: true,
    frontend: {
      element: 'toggle',
      options: { 'Hide window & continue tracking': true, 'Stop tracking & quit': false },
    },
  },

  updateNotification: {
    type: 'boolean',
    name: 'Show update notifications',
    description: 'Notify about Cattr Desktop updates available on launch',
    default: true,
    frontend: {
      element: 'toggle',
      options: { 'Show notifications': true, 'Disable notifications': false },
    },
  },

  usageStatistics: {
    type: 'boolean',
    name: 'Send usage statistics',
    description: 'Share usage statistics with Cattr Developers. Statistics include only versions of Cattr Desktop, Operating System, and backend installation ID. We don\'t collect any personal data, and all collected statistics will be used only to better understand how we can improve the desktop application experience.',
    default: true,
    frontend: {
      element: 'toggle',
      options: { 'Allow usage statistics collection': true, 'Do not send usage reports': false },
    },
  },

  errorReporting: {
    type: 'boolean',
    name: 'Share error reports',
    description: 'When an error occurs, Cattr Desktop will send an anonymized report to the development team with details concerning that error. Application restart is required to apply the new sharing policy.',
    default: true,
    frontend: {
      element: 'toggle',
      options: { 'Share error reports with Developers': true, 'Do not share error reports': false },
    },
  },

};

class UserPreferences extends EventEmitter {

  constructor() {

    super();

    /**
     * @typedef   {Object}  PreferenceEntry  User preferences key-value pair (entry)
     * @property  {String}  key              Preference entry key
     * @property  {String}  value            Preference entry value
     */

    /**
     * Buffer for the values from preference file
     * @type {Object}
     */
    this.preferencesFileBuffer = null;

    // Ensure that configuration file exists
    if (fs.existsSync(configuration.userPreferences.file)) {

      // Reading and parsing existing preferences file
      try {

        log.debug('Preferences file detected, trying to read');
        this.preferencesFileBuffer = JSON.parse(fs.readFileSync(configuration.userPreferences.file));
        log.debug('Preferences file successfully read');

      } catch (error) {

        // Log this error
        log.error('Error during preferences file read and parse', error);

        // Stop execution and show error to user
        throw error;

      }

    } else {

      // Log entry
      log.debug('Preferences file does not exist, creating a new one');

      // File is not exists, create a default one
      const defaultConfigurationContent = {};

      // Getting all configuration keys and default values
      Object.keys(preferences).forEach(key => {

        // Pass default values to the newly created preferences pool
        defaultConfigurationContent[key] = preferences[key].default;

      });

      // Save to configuration file
      fs.writeFileSync(configuration.userPreferences.file, JSON.stringify(defaultConfigurationContent), 'utf-8');
      log.debug('Preferences file has been created');

      // Link default configuration as current preferences file buffer
      this.preferencesFileBuffer = defaultConfigurationContent;

    }

    // Run onpreferencesloaded hook
    this.emit('preferences-loaded');

  }

  /**
   * Returns preference entry value
   * @param  {String}      key  Preferences entry key
   * @return {Promise<*>}       Value of this entry (actual, or default if actual is not exists in file)
   */
  get(key) {

    // Checking input value
    if (typeof key !== 'string' && typeof key !== 'number')
      throw new TypeError(`Incorrect preferences key type: ${key} (${typeof key})`);

    // Return value from the preferences file buffer
    if (typeof this.preferencesFileBuffer[key] !== 'undefined')
      return this.preferencesFileBuffer[key];

    // This key does not exists in preferences file, trying to get default value for this
    if (typeof preferences[key] !== 'undefined') {

      // Add this default value to the configuration file, then save changes
      this.preferencesFileBuffer[key] = preferences[key].default;

      // Commit changes to persistent storage
      fs.writeFileSync(configuration.userPreferences.file, JSON.stringify(this.preferencesFileBuffer), 'utf-8');

      // Return default value
      return preferences[key].default;

    }

    throw new Error(`Preference "${key}" doesn't found`);

  }

  /**
   * Sets preference entry value
   * @param  {String}               key    Preference property name
   * @param  {*}                    value  Value of this property / entry
   * @return UserPreferences
   */
  set(key, value) {

    // Check input values
    if (typeof key !== 'string' && typeof key !== 'number')
      throw new TypeError(`Incorrect preferences key type: ${key} (${typeof key})`);
    if (typeof value === 'undefined')
      throw new TypeError('Preference property value is not set');

    // Checking is this key described in the preferences list
    // (i.e., reject any keys which are not described on top of this file)
    if (typeof preferences[key] === 'undefined')
      throw new Error(`Trying to set value for unknown property: ${key}`);

    // Check is this value in existing file match the new one
    if (this.preferencesFileBuffer[key] && this.preferencesFileBuffer[key] === value)
      return this;

    // Upserting new value to the preferences buffer
    this.preferencesFileBuffer[key] = (preferences[key].type === 'boolean' && typeof value === 'string')
      ? (value === 'true')
      : TypeNameMap.get(preferences[key].type)(value);

    return this;

  }

  /**
   * Sets multiple preferences
   * @param  {Object}  entries  Object with preference values (key is preference entry name)
   * @return UserPreferences
   */
  setMany(entries) {

    // Validate input type
    if (typeof entries !== 'object')
      throw new TypeError(`Preference entries must be passed as object, but ${typeof entries} given`);

    // Apply entries
    Object
      .entries(entries)
      .forEach(([key, value]) => this.set(key, value));

    return this;

  }

  /**
   * Commit preferences changes
   */
  commit() {

    // Commit preferences buffer into persistent storage
    fs.writeFileSync(configuration.userPreferences.file, JSON.stringify(this.preferencesFileBuffer), 'utf-8');

    // Emit "commited" event
    this.emit('commited', this);

  }

  /**
   * Exports current preferences file buffer
   * @return {Promise<Array<PreferenceEntry>>} Array of all Preference Entries
   */
  export() {

    return { ...this.preferencesFileBuffer };

  }

  /**
   * Exports values with the preference entry structure
   * @return {Object} Preference entries with their structures
   */
  exportWithStructure() {

    // Copy preferences object
    const preferencesReplica = { ...preferences };

    // Fill preferences replica with actual values
    Object.keys(preferencesReplica).forEach(preferenceName => {

      // Trying to fetch property with the same name from the persistence storage buffer
      const actualValue = this.preferencesFileBuffer[preferenceName];

      // Set default value as actual value if there is no actual value for this entry
      if (typeof actualValue === 'undefined')
        preferencesReplica[preferenceName].value = preferencesReplica[preferenceName].default;
      else
        preferencesReplica[preferenceName].value = this.preferencesFileBuffer[preferenceName];

    });

    return preferencesReplica;

  }

}

// Create a single global instance of UserPreferences
const userPreferences = new UserPreferences();

// Subscribe to loaded hook to adjust Sentry state per user's preference
userPreferences.on('preferences-loaded', () => {

  Sentry.isEnabled = userPreferences.get('errorReporting');

});

module.exports = userPreferences;
