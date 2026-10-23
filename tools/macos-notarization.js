const fs = require('fs');
const path = require('path');
const debug = require('debug');
require('dotenv').config();

debug.enable('cattr:notarization');
const log = debug('cattr:notarization');

module.exports = async params => {

  if (process.platform !== 'darwin')
    return;

  const credentials = {
    appleApiKey: process.env.APPLE_API_KEY,
    appleApiKeyId: process.env.APPLE_API_KEY_ID,
    appleApiIssuer: process.env.APPLE_API_ISSUER,
  };

  const configuredCredentials = Object.values(credentials).filter(Boolean).length;

  if (configuredCredentials === 0) {

    log('notarization skipped: credentials are not configured');
    return;

  }

  if (configuredCredentials !== Object.keys(credentials).length)
    throw new Error('Incomplete Apple notarization credentials');

  // eslint-disable-next-line global-require
  const { notarize } = require('@electron/notarize');

  const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath))
    throw new Error(`Cannot find application at: ${appPath}`);

  log('notarizing application at %s', appPath);

  await notarize({
    appPath,
    ...credentials,
  });

  log('notarization completed');

};
