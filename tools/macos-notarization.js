const fs = require('fs');
const path = require('path');
const debug = require('debug');
require('dotenv').config();

debug.enable('cattr:notarization');
const log = debug('cattr:notarization');

/**
 * Application ID
 * @type {String}
 */
const appId = 'app.cattr';

module.exports = async params => {

  if (process.platform !== 'darwin')
    return;

  if (process.env.CATTR_NOTARIZE !== 'yes') {

    log('notarization skipped');
    return;

  }

  // eslint-disable-next-line global-require
  const electronNotarize = require('electron-notarize');

  log('notarization triggered');

  const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath))
    throw new Error(`Cannot find application at: ${appPath}`);

  log('notarizing %s found at %s', appId, appPath);
  log('take your seats, this might take a while (usually up to 15 minutes)');
  await electronNotarize.notarize({
    appPath,
    appBundleId: appId,
    appleApiKey: process.env.APPLE_API_KEY,
    appleApiIssuer: process.env.APPLE_API_ISSUER,
  });
  log('notarization... um.. completed');

};
