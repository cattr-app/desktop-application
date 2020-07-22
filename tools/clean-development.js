const path = require('path');
const { app } = require('electron');
const keytar = require('keytar');
const rimraf = require('./rimraf');

const appId = 'cattr-develop';

(async () => {

  // Cleaning keychain
  await keytar.deletePassword(`amazingcat/${appId}`, 'auth-token');
  await keytar.deletePassword(`amazingcat/${appId}`, 'saved-credentials');
  process.stdout.write('Keychain cleaned up\n');

  // Removing database, logs and config
  rimraf.sync(`${path.resolve(app.getPath('appData'), appId)}`, { disableGlob: true });
  process.stdout.write(`Appdata purged ${path.resolve(app.getPath('appData'), appId)}\n`);
  process.exit(0);

})();
