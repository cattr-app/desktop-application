/* eslint global-require: 0 */
const { app, shell, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const config = require('./base/config');
const appIcons = require('./utils/icons');

const { WEBCONTENTS_ALLOWED_PROTOCOLS } = require('./constants/url');
const userPreferences = require('./base/user-preferences');

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

// Register custom protocol for SSO
app.setAsDefaultProtocolClient('cattr');

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
      enableRemoteModule: false,
      contextIsolation: false,
      nativeWindowOpen: true,
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

    // Apply user's decision on error reporting
    sentryConfiguration.enabled = config.sentry.enabled && userPreferences.get('errorReporting');

    // Encode to JSON, then encode to URIEncoded
    sentryConfiguration = encodeURIComponent(JSON.stringify(sentryConfiguration));

    // Load this page
    window.loadURL(`file://${pathToPage}?sentry=${sentryConfiguration}`);
    return true;

  };

  // Intercept external links navigation
  window.webContents.on('will-navigate', (event, url) => {

    // Preventing default behavior, so the link wouldn't be loaded
    // inside the tracker's window
    event.preventDefault();

    // Check is target protocol allowed
    const targetUrl = new URL(url);
    if (!WEBCONTENTS_ALLOWED_PROTOCOLS.has(targetUrl.protocol))
      return;

    // Open link in external browser
    shell.openExternal(url);

  });

  // Generate and inject CSP policy
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {

    // Build a CSP and apply the default policy
    let cspValue = "default-src 'self';";

    // Apply assets policy
    cspValue += "style-src 'self' data: 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:;";

    // Scripts: allow unsafe-eval in dev mode, otherwise Chrome DevTools wouldn't work
    if (config.isDeveloperModeEnabled)
      cspValue += "script-src 'self' 'unsafe-eval';";
    else
      cspValue += "script-src 'self';";

    // If Sentry is enabled, inject also a connect-src CSP allowing requests to Sentry host
    if (config.sentry.enabled && userPreferences.get('errorReporting')) {

      // Parse frontend's DSN to extract the host
      const frontendDsnUrl = new URL(config.sentry.dsnFrontend);

      // Inject connect-src policy allowing connections to self and Sentry hostname
      cspValue += `connect-src 'self' ${frontendDsnUrl.origin};`;

    }

    // Returning injection by callback
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': cspValue,
      },
    });

  });

  // Re-render new page each time when it comes ready
  window.on('ready-to-show', () => {

    // Pass webContents to IPC
    router.setWebContents(window.webContents);

    // Show the main window
    window.show();

  });

  // Weird workaround for Linux (see https://github.com/electron/electron/issues/4544)
  window.setMenuBarVisibility(false);

  // Load frontend entry point
  loadPage('app.html');

  // Open DevTools if we're in development mode
  if (config.isDeveloperModeEnabled && !process.env.DISABLE_DEVTOOLS)
    window.webContents.openDevTools('detached');


});
