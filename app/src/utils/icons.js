const path = require('path');

const iconsDirectory = path.resolve(__dirname, '..', '..', 'assets', 'icons');

module.exports = {

  DEFAULT: `${iconsDirectory}/app/icon.png`,

  tray: {

    IDLE: `${iconsDirectory}/tray/icon-idle.png`,
    TRACKING: `${iconsDirectory}/tray/icon-tracking.png`,
    LOADING: `${iconsDirectory}/tray/icon-loading.png`,

  },

  dock: {

    IDLE: `${iconsDirectory}/dock/icon-idle.png`,
    TRACKING: `${iconsDirectory}/dock/icon-tracking.png`,
    LOADING: `${iconsDirectory}/dock/icon-loading.png`,

  },

};
