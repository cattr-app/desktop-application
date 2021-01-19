/* eslint-disable global-require */
const { ipcMain } = require('electron');
const IPCRouter = require('@amazingcat/electron-ipc-router');
const Logger = require('../utils/log');

const log = new Logger('Router');
log.debug('Starting routes load');

// Creating instance of IPC router
const router = new IPCRouter(ipcMain);

// Expose router instance
module.exports.router = router;

// Proxy IPC.setWebContents method
module.exports.setWebContents = wc => router.setWebContents(wc);

require('./authentication.js')(router);
require('./misc.js')(router);
require('./projects.js')(router);
require('./task-tracking.js')(router);
require('./tasks.js')(router);
require('./time.js')(router);
require('./translation.js')(router);
require('./user-preferences.js')(router);
require('./offline-mode.js')(router);
require('./intervals.js')(router);
