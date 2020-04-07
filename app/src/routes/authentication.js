const Logger = require('../utils/log');
const auth = require('../base/authentication');
const { UIError } = require('../utils/errors');

const log = new Logger('Router:Authentication');
log.debug('Loaded');

module.exports = router => {

  // Checks and sets the API hostname
  router.serve('auth/check-hostname', async request => {

    // Setting hostname
    try {

      // Trying to set hostname
      await auth.setHostname(request.packet.body.hostname);

    } catch (error) {

      return request.send(400, {});

    }

    // Checking is it actually an Cattr instance
    const state = await auth.isCattrInstance();

    // Send 200 OK / 404 Not Found accordingly
    if (state)
      return request.send(200, {});
    return request.send(404, {});

  });

  // Is authentication required
  router.serve('auth/is-authentication-required', async req => {

    req.send(200, { required: (await auth.isAuthenticationRequired()) });

  });

  // Login
  router.serve('auth/authenticate', async request => {

    // Getting request properties
    const { username, password } = request.packet.body;

    // Checking input parameters prescense
    if (typeof username !== 'string' || typeof password !== 'string') {

      request.send(400, { error: 'Incorrect credentials' });
      return;

    }

    // Calling authentication function
    try {

      // Making authentication request
      const authResponse = await auth.userAuthentication(username, password);

      // Returning authenticated user object to renderer
      request.send(200, authResponse);

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError) {

        request.send(error.code, { message: error.message, id: error.errorId });
        return;

      }

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured in authentication route', error);
      request.send(500, { message: 'Internal error occured', id: 'EISR000' });

    }

  });

  // Logout
  router.serve('auth/logout', async request => {

    try {

      await auth.logout();

    } catch (error) {

      // Return UIErrors
      if (error instanceof UIError) {

        request.send(error.code, { message: error.message, id: error.errorId });
        return;

      }

      // Wrap and log all other kinds of errors
      log.error('Operating error occured in logout route', error);
      request.send(500, { message: 'Internal error occured', id: 'EISR000' });

    }

  });

  // Pass user configuration to Sentry on frontend
  auth.events.once('user-fetched', user => router.emit('auth/user-fetched', user));

};
