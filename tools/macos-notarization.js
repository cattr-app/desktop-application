const fs = require('fs');
const path = require('path');
const electronNotarize = require('electron-notarize');
const log = require('debug')('build:notarization');

require('dotenv').config();

/**
 * Application ID
 * @type {String}
 */
const appId = 'app.cattr.desktop';

module.exports = async params => {

  if (process.platform !== 'darwin')
    return;

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
