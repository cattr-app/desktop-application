const config = require('../base/config');


module.exports = {

  DEFAULT: `${config.apppath}/assets/icons/app/icon.png`,

  tray: {

    IDLE: `${config.apppath}/assets/icons/tray/icon-idle.png`,
    TRACKING: `${config.apppath}/assets/icons/tray/icon-tracking.png`,
    LOADING: `${config.apppath}/assets/icons/tray/icon-loading.png`,

  },

  dock: {

    IDLE: `${config.apppath}/assets/icons/dock/icon-idle.png`,
    TRACKING: `${config.apppath}/assets/icons/dock/icon-tracking.png`,
    LOADING: `${config.apppath}/assets/icons/dock/icon-loading.png`,

  }

};
