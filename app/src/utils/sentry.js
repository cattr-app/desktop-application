/**
 * Sentry reporter
 * Important notice: https://github.com/getsentry/sentry-electron/issues/92#issuecomment-453534680
 */

const Sentry = require('@sentry/electron');
const { init } = require('@sentry/electron/dist/main');

const config = require('../base/config');

module.exports.isEnabled = Boolean(config.sentry.enabled);

// Initializes Sentry with configuration
if (module.exports.isEnabled) {

  init({
    dsn: config.sentry.dsn,
    release: config.sentry.release,
    beforeSend(event) {

      if (module.exports.isEnabled)
        return event;

      return null;

    },
  });

}

// Exporting Sentry object
module.exports.Sentry = { Sentry };
