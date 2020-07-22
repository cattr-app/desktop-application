/**
 * Application menu
 */

const { Menu } = require('electron');
const osIntegration = require('../base/os-integration');

/**
 * Template buffer
 * @type {Array<Object>}
 */
const applicationMenuTemplate = [];

/**
 * Application default things
 */
applicationMenuTemplate.push({

  label: 'Application',
  submenu: [

    { label: 'About', selector: 'orderFrontStandardAboutPanel:' },
    { type: 'separator' },
    { label: 'Quit', accelerator: 'Command+Q', click: osIntegration._windowClose },

  ],

});

/**
 * Edit tab (implements clipboard functions)
 */
applicationMenuTemplate.push({

  label: 'Edit',
  submenu: [

    { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
    { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
    { type: 'separator' },
    { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
    { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
    { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
    { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' },

  ],

});

// Build menu after osIntegration is initialises
osIntegration.on('window-is-set', () => Menu.setApplicationMenu(Menu.buildFromTemplate(applicationMenuTemplate)));
