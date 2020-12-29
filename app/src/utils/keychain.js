const keytar = require('keytar');
const Log = require('./log');
const config = require('../base/config');

const logger = new Log('Keychain');

/**
 * @typedef  {Object}  SavedCredentials
 * @property {String}  hostname  Remote server URL
 * @property {String}  email     Saved email
 * @property {String}  password  Saved password
 */

/**
 * @typedef   {Object}  Token
 * @property  {String}  token  Token string
 * @property  {String}  type   Token type (i.e., bearer)
 */

/**
 * Returns saved credentials from the system keychain
 * @return {Promise<SavedCredentials>|Null} Saved credentials
 */
const getSavedCredentials = async () => {

  let fetchedCredentials = '';

  // Trying to fetch credentials from OS keychain
  try {

    fetchedCredentials = await keytar.getPassword(config.credentialsStore.service, 'saved-credentials');

  } catch (error) {

    // Log this error and return null to keep system working
    logger.error(800, error);
    return null;

  }

  // Checking is this password exists
  if (!fetchedCredentials)
    return null;


  // Parse saved credentials
  try {

    fetchedCredentials = JSON.parse(fetchedCredentials);

  } catch (error) {

    // Log this error and return null to keep system working
    logger.error(801, error);
    return null;

  }

  // Check content of the saved credentials
  if (typeof fetchedCredentials.hostname !== 'string') {

    // Log error and return nothing
    logger.error('Saved credentials does not contain required "hostname" field', 802);
    return null;

  }

  logger.debug('Fetched saved credentials from system keychain');
  return fetchedCredentials;

};


/**
 * Returns saved token from the system keychain
 * @return {Promise<Token>|Null} Saved token
 */
const getSavedToken = async () => {

  try {

    // Trying to fetch token from OS keychain
    let token = await keytar.getPassword(config.credentialsStore.service, 'auth-token');

    // Returning token or null if it's not exists
    if (!token)
      return null;

    // Decoding and returning the token
    token = JSON.parse(token);

    // Checking fields
    if (typeof token.type === 'undefined' || typeof token.token === 'undefined')
      throw new Error('Token in system keychain has an incorrect structure');

    return { token: token.token, tokenType: token.type, tokenExpire: new Date(token.expire) };

  } catch (error) {

    // Log this error and return null to keep system working
    logger.error(800, error);
    return null;

  }

};


/**
 * Saves credentials into OS keychain
 * @param  {Object}                  credentials  Credentials
 * @return {Promise<Boolean>|Error}               Boolean(true) if succeed, Error if not
 */
const saveCredentials = async credentials => {

  // Trying to save them into system keychain
  await keytar.setPassword(config.credentialsStore.service, 'saved-credentials', JSON.stringify(credentials));
  logger.debug(`Saved credentials into system keychain for account: ${credentials.email}`);
  return true;

};

/**
 * Saves token into keychain
 * @param  {String}                 token  Token
 * @param  {String}                 type   Type of the token (i.e., bearer)
 * @param  {Date}                   expire Expiration date
 * @return {Promise<Boolean>|Error}        Boolean(true) if succeed, error if not
 */
const saveToken = async (token, type, expire) => {

  // Checking input arguments
  if (typeof token !== 'string' || typeof type !== 'string')
    throw new TypeError('Incorrect token to save into keychain');

  // Trying to save them into system keychain
  await keytar.setPassword(config.credentialsStore.service, 'auth-token', JSON.stringify({ type, token, expire }));
  logger.debug('Saved token into system keychain');
  return true;

};

/**
 * Removes token from system keychain
 * @return {Promise<Boolean|Error>} Returns Boolean(true) if succeed, error otherwise
 */
const removeToken = async () => {

  // Removing
  keytar.deletePassword(config.credentialsStore.service, 'auth-token');
  logger.debug('Removed token from system keychain');
  return true;

};


/**
 * Removes saved credentials from system keychain
 * @return {Promise<Boolean|Error>} Returns Boolean(true) if succeed, error otherwise
 */
const removeSavedCredentials = async () => {

  // Removing
  keytar.deletePassword(config.credentialsStore.service, 'saved-credentials');
  logger.debug('Removed saved credentials from system keychain');
  return true;

};

module.exports = {

  getSavedCredentials,
  getSavedToken,
  saveCredentials,
  saveToken,
  removeToken,
  removeSavedCredentials,

};
