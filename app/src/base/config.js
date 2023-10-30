const fs = require('fs');
const { resolve } = require('path');
const { app } = require('electron');
const argv = require('minimist')(process.argv.slice(2));
const packageManifest = require('../../../package.json');

// Development mode rules
const isDeveloperModeEnabled = (

  // Specific environment variable
  process.env.AT_DEVMODE === 'meow'

);

/**
 * Identifier of the package used in the filesystem and keychain
 * @type {String}
 */
const packageId = isDeveloperModeEnabled ? 'cattr-develop' : 'cattr';

/**
 * Version of this Cattr package
 * @type {String}
 */
const packageVersion = packageManifest.version;

// Basic configuration
const configuration = {

  packageId,
  packageVersion,

  // Application data directory
  appdata: isDeveloperModeEnabled ? app.getPath('userData').concat('-develop') : app.getPath('userData'),

  // Application codebase path
  apppath: app.getAppPath(),

  // Is we're currently in development mode?
  isDeveloperModeEnabled,

};

// Sentry error handling
configuration.sentry = {

  // Is Sentry enabled?
  enabled: !isDeveloperModeEnabled || process.env.AT_SENTRY === 'force',

  // Main application DSN
  dsn: 'https://b0ab7e30102244948431ecf5b1eb9c9a@sentry.amazingcat.net/15',

  // Frontend application DSN
  dsnFrontend: 'https://00bd1ee1db824310812252bb96e96945@sentry.amazingcat.net/14',

  // Setting the current release
  release: `cattr@${packageVersion}`,

};

// Ensure that application data directory actually exists
if (!fs.existsSync(configuration.appdata))
  fs.mkdirSync(configuration.appdata);

// Ensure that database directory actually exists
if (!fs.existsSync(resolve(configuration.appdata, 'db')))
  fs.mkdirSync(resolve(configuration.appdata, 'db'));

// Database configuration
configuration.localDB = {

  // Sequelize options
  opts: {

    // Set SQLite as dialect
    dialect: 'sqlite',

    // Set database path
    storage: resolve(configuration.appdata, 'db', 'main.db'),

    // Disable SQL queries logging by default, enable via flag
    logging: (argv['debug-sql-logging'] === 'true'),

  },

};

// Logger settings
configuration.logger = {

  // Logs directory
  directory: argv['logs-directory'] || resolve(configuration.appdata, 'logs'),

};

// Credentials storage
configuration.credentialsStore = {

  // Service identifier
  service: `amazingcat/${packageId}`,

};

// User Preferences file
configuration.userPreferences = {

  file: `${configuration.appdata}/at-user-preferences.json`,

};

// Usage statistics reporter
configuration.usageStatistics = {

  /**
   * Report usage statistics
   * Notice that even if reporting is enabled here, priority is on User Preferences parameter.
   * In other words, even if stats is enabled here, user's decision in Settings is more important.
   */
  enabled: true,

  /**
   * Base URL of statistics collector
   */
  collectorUrl: 'https://stats.cattr.app',

};

// New release available notification
configuration.updateNotification = {

  /**
   * Enables update notification mechanism
   * Notice that user preference "DISABLE" is overriding this value
   * @type {Boolean}
   */
  enabled: (!process.windowsStore && !process.mas),

  /**
   * Base URL to retrieve releases manifest
   * @type {String}
   */
  manifestBaseUrl: 'https://git.amazingcat.net/api/v4/projects/353/releases/permalink/latest',

  /**
   * URL to downloads page
   * @type {String}
   */
  downloadsPageUrl: 'https://cattr.app/desktop',

};

// Export configuration
module.exports = configuration;
