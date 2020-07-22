/* eslint global-require: 0 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const config = require('./base/config');
const appIcons = require('./utils/icons');

/**
 * Object, containing Electron browser window
 * @type {Object}
 */
let window = {};

// Second instance protection
if (!config.isDeveloperModeEnabled) {

  // If single instance lock successfully set — we are the first running instance
  if (app.requestSingleInstanceLock()) {

    app.on('second-instance', () => {

      // Reveal window then focus on it if it's exists
      if (!window)
        return;
      window.restore();
      window.focus();

    });

  } else
    app.quit();

}

// Wait until Electron comes ready
app.once('ready', async () => {

  // Load database
  await require('./models').init();

  const router = require('./routes');
  const osIntegration = require('./base/os-integration');

  // Creates new window with specified parameters
  window = new BrowserWindow({

    minWidth: 480,
    minHeight: 580,
    width: 480,
    height: 580,
    maxWidth: 640,
    maxHeight: 700,
    frame: true,
    show: false,
    center: true,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true,
      nativeWindowOpen: true,
      enableRemoteModule: true,
    },
    icon: appIcons.DEFAULT,

  });

  // Pass the window into OS integration module
  osIntegration.init(window);

  // Load components
  require('./components')();

  /**
   * Loads a page into browser window + passing Sentry configuration
   * @param  {String} page Page to load
   * @return {Boolean}     Returns true if succeed
   */
  const loadPage = page => {

    // Building absolute path to the requested page
    const pathToPage = path.resolve(__dirname, '../../build', page);

    // Is this page exists?
    if (!fs.existsSync(pathToPage))
      throw new Error(`Requested page ${page} was not found`);

    // Encoding the Sentry configuration
    let sentryConfiguration = {};

    // Cloning the original configuration
    Object.assign(sentryConfiguration, config.sentry);

    // Removing large but useless field which can potentialy broke Sentry on renderer
    delete sentryConfiguration.defaultIntegrations;

    // Encode to JSON, then encode to URIEncoded
    sentryConfiguration = encodeURIComponent(JSON.stringify(sentryConfiguration));

    // Load this page
    window.loadURL(`file://${pathToPage}?sentry=${sentryConfiguration}`);
    return true;

  };

  // Re-render new page each time when it comes ready
  window.on('ready-to-show', () => {

    // Pass webContents to IPC
    router.setWebContents(window.webContents);
    window.show();

  });

  // Weird workaround for Linux (see https://github.com/electron/electron/issues/4544)
  window.setMenuBarVisibility(false);


  // Load frontend entry point
  loadPage('app.html');

  // Open DevTools if we're in development mode
  if (config.isDeveloperModeEnabled) {

    // Vue Devtools disabled until package maintainer will fix install script
    // require('vue-devtools').install();
    window.webContents.openDevTools('detached');

  }

});
