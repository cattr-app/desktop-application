const fs = require('fs');
const path = require('path');
const electronNotarize = require('electron-notarize');

require('dotenv').config();

/**
 * Application ID
 * @type {String}
 */
const appId = 'app.cattr.desktop';

module.exports = async params => {

  if (process.platform !== 'darwin')
    return;

  console.log('notarization triggered');

  const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath))
    throw new Error(`Cannot find application at: ${appPath}`);

  console.log('Notarizing %s found at %s', appId, appPath);
  await electronNotarize.notarize({
    appPath,
    appBundleId: appId,
    appleApiKey: process.env.APPLE_API_KEY,
    appleApiIssuer: process.env.APPLE_API_ISSUER
  });
  console.log('notarization... um.. completed');

};
