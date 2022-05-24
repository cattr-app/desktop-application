const Cattr = require('@cattr/node');
const keychain = require('../utils/keychain');

const api = new Cattr();

api.tokenProvider = {

  get: keychain.getSavedToken,
  set: keychain.saveToken,

};

api.credentialsProvider = {

  get: keychain.getSavedCredentials,
  set: keychain.saveCredentials,

};

module.exports = api;
