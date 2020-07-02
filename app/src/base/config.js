const fs = require('fs');
const { resolve } = require('path');
const { app } = require('electron');
const argv = require('minimist')(process.argv.slice(2));

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

// Basic configuration
const configuration = {

  packageId,

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
  enabled: true,

  // Main application DSN
  dsn: 'https://b3c99721c14c4e2399de2d46dc89caba@sentry.amazingcat.net/2',

  // Frontend application DSN
  dsnFrontend: 'https://2bc3716988cd42979e511f629a8e97a3@sentry.amazingcat.net/4',

  // Setting the current release
  release: 'cattr-desktop@2.4.0',

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

// Export configuration
module.exports = configuration;
