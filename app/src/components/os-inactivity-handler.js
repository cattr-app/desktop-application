const { app, Notification } = require('electron');
const tracker = require('../base/task-tracker');
const osIntegration = require('../base/os-integration');
const translation = require('../base/translation');

class OsInactivityHandler {

  constructor() {

    this._inactivityResultAccepted = false;

    this._macBounceId = null;

    this._macInactivityNotify = null;

    tracker.on('activity-proof-request', () => {

      this._inactivityResultAccepted = false;

      osIntegration.windowFocus();

      osIntegration.window.flashFrame(true);

      if (process.platform === 'darwin') {

        if (!this._macInactivityNotify) {

          this._macInactivityNotify = new Notification({
            title: translation.translate('Cattr'),
            body: translation.translate('Are you still working?'),
            silent: false,
            hasReply: false,
            closeButtonText: translation.translate('No'),
            actions: [
              {
                text: translation.translate('Yes'),
                type: 'button',
              },
            ],
          });

          this._macInactivityNotify.on('close', () => {

            if (!this._inactivityResultAccepted) {

              this._inactivityResultAccepted = true;
              tracker.emit('activity-proof-result', false);

            }

          });
          this._macInactivityNotify.on('action', (action, index) => {

            if (index === 0 && !this._inactivityResultAccepted) {

              this._inactivityResultAccepted = true;
              tracker.emit('activity-proof-result', true);

            }

          });

          this._macInactivityNotify.show();

        }

        if (!this._macBounceId && app.dock && app.dock.bounce)
          this._macBounceId = app.dock.bounce('critical');

      }

    });

    tracker.on('activity-proof-result', result => {

      this._inactivityResultAccepted = true;

      osIntegration.window.flashFrame(false);

      if (process.platform === 'darwin') {

        if (this._macInactivityNotify) {

          this._macInactivityNotify.close();
          this._macInactivityNotify = null;

        }

        if (!result) {

          const notify = new Notification({
            title: translation.translate('Cattr'),
            body: translation.translate('Tracker was stopped due to inactivity!'),
            silent: false,
            hasReply: false,
            closeButtonText: translation.translate('Close'),
          });
          notify.show();

        }

        if (this._macBounceId && app.dock && app.dock.cancelBounce) {

          app.dock.cancelBounce(this._macBounceId);
          this._macBounceId = null;

        }

      }

    });

  }

}

module.exports = new OsInactivityHandler();
