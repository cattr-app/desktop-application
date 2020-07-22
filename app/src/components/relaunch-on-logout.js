const { app } = require('electron');
const osIntegration = require('../base/os-integration');
const authentication = require('../base/authentication');

// Handle logged-out event
authentication.events.on('logged-out', () => {

  // Set relaunch flag
  app.relaunch();

  // Close application gracefully
  osIntegration.gracefullExit();

});
