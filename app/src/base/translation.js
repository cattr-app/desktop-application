/**
 * Translations support
 */

const { EventEmitter } = require('events');
const Log = require('../utils/log');
const translationsLoader = require('../utils/translations');
const userPreferences = require('./user-preferences');

const log = new Log('Translation');

/**
 * Translations
 */
class Translation extends EventEmitter {

  /**
   * Initialises translations for i18next
   */
  constructor() {

    super();

    /**
     * Available translation resources
     * @type {Object}
     */
    this._resources = translationsLoader.resources;

    /**
     * Available languages
     * @type {Object}
     */
    this._languages = translationsLoader.languages;

    /**
     * Default fallback language
     * @type {String}
     */
    this.DEFAULT_FALLBACK_LANG = 'en';

    /**
     * Currently selected language
     * @type {String}
     */
    this._currentLanguage = userPreferences.get('language');

    // Check availability of the selected language
    if (typeof this._resources[this._currentLanguage] === 'undefined') {

      // Check availability for the fallback language
      if (typeof this._resources[this.DEFAULT_FALLBACK_LANG] === 'undefined') {

        // Fallback language is not available, select first available lang
        [this._currentLanguage] = Object.keys(this._resources);

        // Leave a message
        log.error('TRS01', `Falling back to first available language, because selected & fallback are not available: ${this._currentLanguage}`);

      } else {

        // Log entry
        log.error('TRS02', `Falling back to fallback language because selected language is not available: ${this._currentLanguage}`);

        // Select fallback language
        this._currentLanguage = this.DEFAULT_FALLBACK_LANG;

      }

    }

    // Subscribe user preferences "commited" event
    userPreferences.on('commited', () => {

      // Update current language if user preferences changed & saved
      this.updateLanguage();

    });

  }

  /**
   * Get translation by the key
   * @param  {String} key Translation Resource key
   * @return {String}     Translation
   */
  translate(key) {

    if (Object.prototype.hasOwnProperty.call(this._resources[this._currentLanguage].translation, key))
      return this._resources[this._currentLanguage].translation[key];
    return key;

  }

  /**
   * Returns map of available languages
   * @return {Object} Map between full language title and code
   */
  getLanguages() {

    return this._languages;

  }

  /**
   * Return configuration for i18next
   * @return {Object} i18next configuration
   */
  getConfiguration() {

    return { lng: this._currentLanguage, resources: this._resources };

  }

  /**
   * Updates current language
   * @param {String|null}  language  Language to set
   * If null / empty argument passed, language will be pulled from user preferences
   */
  updateLanguage(language = null) {

    // Get new language from args or userPreferences
    const newLanguage = language || userPreferences.get('language');
    if (this._currentLanguage !== newLanguage) {

      // Update current language
      this._currentLanguage = newLanguage;

      // Emit "lanuage-changed" event
      this.emit('language-changed', { newLanguage, translation: this });

    }

  }

}

// Initialize Translation module and export ready-to-use instance
module.exports = new Translation();
