/* eslint-disable global-require */
/**
 * Loads application components
 */
module.exports = () => {

  require('./application-menu.js');
  require('./disable-production-hotkeys.js');
  require('./screen-notie.js');
  require('./tray.js');
  require('./relaunch-on-logout.js');
  require('./power-manager.js');
  require('./os-inactivity-handler.js');
  require('./usage-statistic');
  require('./log-rotate');

};
