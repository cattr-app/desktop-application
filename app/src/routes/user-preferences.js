const Logger = require('../utils/log');
const { UIError } = require('../utils/errors');
const config = require('../base/config');
const userPreferences = require('../base/user-preferences');

const log = new Logger('Router:UserPreferences');
log.debug('Loaded');

module.exports = router => {

  /**
   * Handles user preferences bulk export with the structure
   */
  router.serve('user-preferences/export-structure', async request => {

    try {

      const preferences = await userPreferences.exportWithStructure();
      return request.send(200, {
        preferences,
        version: {
          package: config.packageId,
          number: config.packageVersion,
          devMode: config.isDeveloperModeEnabled,
          sentry: config.sentry.enabled,
        },
      });

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        // {error: error.error} means we are passing error that initially triggered UIError
        return request.send(error.code, { message: error.message, id: error.errorId, error: error.error == null ? error.error : JSON.parse(JSON.stringify(error.error)) });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured in the user preferences structured export', error);
      request.send(500, { message: 'Internal error occured', id: 'ERTU500' });

      return false;

    }

  });

  /**
   * Handles user preferences bulk action save
   */
  router.serve('user-preferences/set-many', async request => {

    try {

      // Extract and check preferences list
      const { preferences } = request.packet.body;
      if (typeof preferences !== 'object')
        throw new UIError(400, 'Incorrect preferences container received', 'ERTU400');

      // Apply changes
      userPreferences.setMany(preferences).commit();
      return request.send(200, {});

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        // {error: error.error} means we are passing error that initially triggered UIError
        return request.send(error.code, { message: error.message, id: error.errorId, error: error.error == null ? error.error : JSON.parse(JSON.stringify(error.error)) });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured in the user preferences bulk set', error);
      request.send(500, { message: 'Internal error occured', id: 'ERTT500' });

      return false;

    }

  });

};
