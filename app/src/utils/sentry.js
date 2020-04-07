/**
 * Sentry reporter
 * Important notice: https://github.com/getsentry/sentry-electron/issues/92#issuecomment-453534680
 */

const Sentry = require('@sentry/electron');
const { init } = require('@sentry/electron/dist/main');

const config = require('../base/config');

// Initializes Sentry with configuration
if (config.sentry.enabled) {

  init({

    dsn: config.sentry.dsn,
    release: config.sentry.release,

  });

}

// Exporting Sentry object
module.exports = Sentry;
