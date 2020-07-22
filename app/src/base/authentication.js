const EventEmitter = require('events');
const { app } = require('electron');
const api = require('./api');
const Log = require('../utils/log');
const keychain = require('../utils/keychain');
const { UIError } = require('../utils/errors');
const jwt = require('../utils/jwt');
const db = require('../models');
const OfflineUser = require('../controller/offline-user');
const OfflineMode = require('./offline-mode');
const Sentry = require('../utils/sentry');

const log = new Log('AuthenticationProvider');

/**
 * @typedef   {Object}  Token
 * @property  {String}  token  Token string
 * @property  {String}  type   Token type (i.e., bearer)
 */

/**
 * Variable, contains current user properties
 * @type {Object|null}
 */
let _currentUser = null;

/**
 * Authentication events
 * @type {EventEmitter}
 */
module.exports.events = new EventEmitter();

module.exports.events.once('user-fetched', user => Sentry.configureScope(s => s.setUser({ email: user.email })));

/**
 * Checks is this is Cattr API instance
 * @return {Promise<Boolean>} True, if it's working Cattr instance, False otherwise
 */
module.exports.isCattrInstance = async () => {

  try {

    return await api.isCattrInstance();

  } catch (err) {

    return false;

  }

};


/**
 * Makes authentication request
 * @param  {String}                    email     Email
 * @param  {String}                    password  Password
 * @return {Promise<Object|UIError>}             User object if succeed, UIError otherwise
 */
module.exports.authenticate = async (email, password) => {

  // Checking input parameters
  if (typeof email !== 'string' || typeof password !== 'string')
    throw new UIError(400, 'Incorrect credentials given', 'EAUTH000');

  // Authenticating using library function
  let authenticationResponse = {};
  try {

    authenticationResponse = await api.authentication.login(email, password);

  } catch (error) {

    // Checking is it a system error
    if (!error.isApiError) {

      // Log it
      log.error('Request error occured during authentication', error);
      throw new UIError(500, 'Request to server was failed', 'EAUTH500');

    }

    // Throw different errors according to the status codes in response
    switch (error.statusCode) {

      case 401:
        throw new UIError(400, 'Incorrect credentials given', 'EAUTH000');
      case 403:
        throw new UIError(403, 'Invalid credentials given', 'EAUTH001');
      default:
        log.error(`EAUTH506-${error.statusCode}`, 'Unspecified status code received from server during authentication', true);
        Log.captureApiError('Unknown status code received during authentication request', error);
        throw new UIError(500, 'Request to server was failed', 'EAUTH500');

    }

  }

  // Saving user from authentication response
  _currentUser = authenticationResponse.user;
  module.exports.events.emit('user-fetched', _currentUser);
  await OfflineUser.setProperties(authenticationResponse.user);
  await OfflineUser.commit();

  // Saving token into system keychain
  try {

    await keychain.saveToken(
      authenticationResponse.token.token,
      authenticationResponse.token.tokenType,
      authenticationResponse.token.tokenExpire,
    );

  } catch (error) {

    log.error('Error occured during saving token into system keychain', error);
    throw new UIError(500, 'Internal error occured', 'EAUTH500');

  }

  // Fire authenticated event
  module.exports.events.emit('authenticated');

  log.debug(`Account ${email} successfully authenticated`);
  return authenticationResponse;

};


/**
 * Token getter
 * @return {Promise<Token|UIError>} Returns Token object if success, null otherwise
 */
module.exports.getToken = async () => {

  // Trying to get token
  const token = await keychain.getSavedToken();

  try {

    // Checking if token exists in system keychain
    if (token) {

      // Checking token validity (assume token as expired, if it'll expire in 12 hours or less)
      if (jwt.checkTimeValidity(token.token, (1000 * 60 * 12))) {

        // Obtaininig hostname
        const { hostname } = await keychain.getSavedCredentials();
        await this.setHostname(hostname);
        return token;

      }

      // Refreshing token
      log.debug('Token is near to expire or already expired, refreshing..');

      // Trying to get saved credentials (we need hostname)
      const { hostname } = await keychain.getSavedCredentials();

      // Setting hostname for API client
      await this.setHostname(hostname);

      // Actually refreshing token
      const newToken = await api.authentication.refresh();

      log.debug('Token successfully refreshed');

      // Save into keychain
      await keychain.saveToken(newToken.token, newToken.type, new Date(newToken.expire));

      // Return refreshed token
      return newToken;

    }

    // Trying to get saved credentials
    const credentials = await keychain.getSavedCredentials();

    // Checking if saved credentials exists
    if (!credentials) {

      log.warning('Cannot find the way to fetch token automatically');
      throw new UIError(802, 'There is no available ways to fetch token', 'EAUTH001');

    }

    // Set API hostname based on the saved credentials
    await api.credentialsProvider.set();

    // Make authentication request
    const authRequest = await this.authenticate(credentials.email, credentials.password);

    // If it's succeed, token is already saved in keychain and we can simply return it
    log.debug('Successfully obtained new token using credentials');
    return authRequest;

  } catch (error) {

    // Transparently pass all UIErrors
    if (error instanceof UIError)
      throw error;

    // Catch other errors
    log.error('Error occurred during token getting', error);
    throw new UIError(500, 'Unhandled system error occured', 'EAUTH502');

  }

};


/**
 * Returns current user parameters
 * @return {Object|null} Returns user object if success, null otherwise
 */
module.exports.getCurrentUser = async () => {

  try {

    // Checking if current user exists in buffer
    if (_currentUser && _currentUser.id !== 'undefined')
      return _currentUser;

    let user = null;

    // Trying to fetch user from API
    try {

      user = await api.authentication.me();

    } catch (err) {

      // Perform logout operation if user is disabled or removed
      if (err.isApiError && err.type === 'authorization.user_disabled') {

        log.warning('Current user is disabled or removed from server, logging out...');
        await module.exports.logout();
        app.quit();

      }

      log.warning('Failed to fetch user from API, seems like that we\'re offline');

    }

    // Saving user if it is successfully retrieved from API
    if (user) {

      _currentUser = user;
      module.exports.events.emit('user-fetched', _currentUser);
      OfflineUser.setProperties(user);
      await OfflineUser.commit();
      return user;

    }

    // Fetching user properties from local storage
    await OfflineUser.fetch();
    if (!OfflineUser.user.id)
      throw new UIError(803, 'There is no available ways to fetch user properties', 'EAUTH0803');

    log.debug('Fetched user from local storage');
    _currentUser = OfflineUser.user;
    module.exports.events.emit('user-fetched', _currentUser);
    OfflineMode.trigger();
    return _currentUser;

  } catch (error) {

    // Transparently pass all UIErrors
    if (error instanceof UIError)
      throw error;

    // Handle other errors
    log.error('Error occured during current user getting', error);
    throw new UIError(500, 'Unhandled system error occured', 'EAUTH504');

  }

};


/**
 * Checking is authentication required
 * @return {Promise<Boolean>} Returns true / false accordingly to the auth status
 */
module.exports.isAuthenticationRequired = async () => {

  try {

    // Token getting routine should do all the job by itself
    await this.getToken();

    // Check token via real API request
    _currentUser = await this.getCurrentUser();
    module.exports.events.emit('user-fetched', _currentUser);

    // .. if it's done, we're good to go w/out authentication
    return false;

  } catch (error) {

    // Filter expected errors
    if (error instanceof UIError && error.code === 802)
      return true;

    if (error instanceof UIError && error.code === 803)
      return true;

    if (error.isApiError && error.statusCode === 403)
      return true;

    // Log all other
    log.error('Error occured during authentication requirement check', error);

    // Require reauthentication
    return true;

  }

};


/**
 * Performs user-friendly authentication
 * @param  {String}                  email         User's email
 * @param  {String}                  password      User's password
 * @param  {Boolean}                 [save=true]   Should we save this credentials into the system keychain?
 * @return {Promise<Object|UIError>}               Returns User object if succeed, UIError otherwise
 */
module.exports.userAuthentication = async (email, password, save = true) => {

  // Running authentication routine
  try {

    // Performing authentication
    const authRequest = await this.authenticate(email, password);

    // Save credentials if neccessary
    if (save)
      await keychain.saveCredentials({ hostname: api.baseUrl, email, password });

    // Return user object from authentication request
    return authRequest.user;

  } catch (error) {

    // If it's an UIError - simply pass to next handler
    if (error instanceof UIError)
      throw error;

    // Otherwise, log this issue and return internal error
    log.error('Error occured during user authentication', error);
    throw new UIError(500, 'Internal error occured during user authentication', 'EAUTH501');

  }

};


/**
 * Sets remote API hostname
 * @param   {String}           hostname  Hostname
 * @returns {Boolean|UIError}            Boolean(true) if success, UIError otherwise
 */
module.exports.setHostname = async hostname => {

  if (typeof hostname !== 'string')
    throw new UIError(400, 'Incorrect hostname given', 'EAUTH001');

  await api.setBaseUrl(hostname);
  return true;

};

/**
 * Poke the server with a stick to check, if it is alive
 */
module.exports.ping = async () => {

  try {

    return await api.ping();

  } catch (error) {

    log.error('Unexpected error with server checkout', error);
    return false;

  }

};

/**
 * Logout
 * @return {Promise<Boolean|Error>} Returns True if succeed, error otherwise
 */
module.exports.logout = async () => {

  try {

    // Logout on API side
    try {

      await api.authentication.logout();
      log.debug('Successfully logged out from server');

    } catch (error) {

      // Ignore errors during logout
      // Kinda of temporary fix
      log.warning(`Error occured during logout request (ignoring): ${error}`);

    }

    // Removing system keychain entries
    await keychain.removeToken();
    await keychain.removeSavedCredentials();
    _currentUser = null;

    // Flushing database
    const toDestroy = Object.values(db.db.sequelize.models).map(model => {

      if (model.tableName === 'SequelizeMeta')
        return false;

      return model.destroy({ truncate: true, force: true });

    });

    await Promise.all(toDestroy);

    // Fire logout event
    module.exports.events.emit('logged-out');

    return true;

  } catch (error) {

    // Transparently pass all UIErrors
    if (error instanceof UIError)
      throw error;

    // Handle real errors
    log.error('Error occured during logout', error);
    throw new UIError(500, 'Unhandled system error occured', 'EAUTH503');

  }

};
