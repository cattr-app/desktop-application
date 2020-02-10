const { powerMonitor, powerSaveBlocker } = require('electron');
const tracker = require('../base/task-tracker');
const osIntegration = require('../base/os-integration');
const Logger = require('../utils/log');

const log = new Logger('PowerManager');

class PowerManager {

  constructor() {

    this._suspendDetected = false;
    this._powerSaveBlockedId = -1;

    powerMonitor.on('suspend', () => {

      log.debug('System going to sleep.');
      this.pauseTracking();

    });
    powerMonitor.on('resume', () => {

      log.debug('System resumed from sleep state.');
      this.resumeTracking();

    });

    powerMonitor.on('lock-screen', () => {

      log.debug('System locked.');
      this.pauseTracking();

    });
    powerMonitor.on('unlock-screen', () => {

      log.debug('System unlocked.');
      this.resumeTracking();

    });

    powerMonitor.on('shutdown', () => osIntegration.gracefullExit());

    tracker.on('started', () => {

      this._powerSaveBlockedId = powerSaveBlocker.start('prevent-display-sleep');
      if (powerSaveBlocker.isStarted(this._powerSaveBlockedId))
        log.debug('Prevent display sleep while tracking!');
      else
        log.warning('Can\'t setup Power Save Blocker!');

    });
    tracker.on('stopped', () => {

      if (this._powerSaveBlockedId > -1 && powerSaveBlocker.isStarted(this._powerSaveBlockedId)) {

        log.debug('Now display can sleep!');
        powerSaveBlocker.stop(this._powerSaveBlockedId);

      }

    });

    log.debug('Loaded');

  }

  pauseTracking() {

    if (tracker.active && !this._suspendDetected) {

      this._suspendDetected = true;
      tracker.pauseTicker();
      log.debug('Tracker paused.');

    }

  }

  resumeTracking() {

    if (this._suspendDetected) {

      this._suspendDetected = false;
      tracker.resumeTicker();
      log.debug('Tracker resumed.');

    }

  }

}

module.exports = new PowerManager();
