const Logger = require('../utils/log');
const { UIError } = require('../utils/errors');
const TaskTracker = require('../base/task-tracker');
const OSIntegration = require('../base/os-integration');
require('../base/deferred-handler');

const log = new Logger('Router:Tracking');
log.debug('Loaded');

module.exports = router => {

  // Start tracking
  router.serve('tracking/start', async request => {

    try {

      // Object to handle packet body
      const requestData = request.packet.body;

      // Checking is taskId parameter exists
      if (!requestData.taskId)
        throw new UIError(400, 'Incorrect task identifier', 'ERTR400');

      // Check tracking availability
      const trackingAvailability = await OSIntegration.constructor.getTrackingAvailability();

      // Return error status if tracking is unavailable
      if (!trackingAvailability.available)
        return request.send(501, { reason: trackingAvailability.reason });

      // Starting tracker
      await TaskTracker.start(requestData.taskId);

      // Return successful response
      return request.send(200, {});

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        // {error: error.error} means we are passing error that initially triggered UIError
        return request.send(error.code, { message: error.message, id: error.errorId, error: error.error == null ? error.error : JSON.parse(JSON.stringify(error.error)) });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured in start tracking route', error);
      request.send(500, { message: 'Internal error occured', id: 'ERTR500' });

      return false;

    }

  });

  // Stop tracking
  router.serve('tracking/stop', async request => {

    try {

      // Stopping time tracker
      await TaskTracker.stop();

      // Respond with success code
      request.send(200, {});

      return true;

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError) {
        return request.send(400, {
          code: error.code,
          message: error.message,
          id: error.errorId,
          error: error.error == null ? error.error : JSON.parse(JSON.stringify(error.error)), // {error: error.error} means we are passing error that initially triggered UIError
        });

      }

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured in stop tracking route', error);
      request.send(500, { code: 500, message: 'Internal error occured', id: 'ERTR501' });

      return false;

    }

  });

  // Activity proof result
  router.serve('tracking/activity-proof-result', async req => {

    // Check verification flag existence
    if (typeof req.packet.body.verified === 'undefined')
      log.error('ERTR003', 'Activity proof result is not defined');

    // Pass event to TaskTracker
    TaskTracker.emit('activity-proof-result', req.packet.body.verified);

  });

  router.serve('tracking/resume-work-after-inactivity', async () => {

    router.emit('inactivity-modal/resume-work-after-inactivity', {});

  });

  // Pass ticks to the frontend
  TaskTracker.on('tick', overallTicks => router.emit('tracking/event-tick', { ticks: overallTicks }));
  TaskTracker.on('tick-relative', relTicks => router.emit('tracking/event-tick-relative', { ticks: relTicks }));
  TaskTracker.on('activity-proof-request', stopTime => router.emit('tracking/activity-proof-request', { stopTime }));
  TaskTracker.on('activity-proof-result-accepted', result => {

    router.emit('tracking/activity-proof-result-accepted', { result });

  });
  TaskTracker.on('activity-proof-result-not-accepted', res => {

    router.emit('tracking/interval-removed', { interval: res });
    router.emit('tracking/activity-proof-result-not-accepted', { totalTicks: res.duration });
    router.emit('misc/update-not-synced-amount', {});

  });
  TaskTracker.on('started', taskId => router.emit('tracking/event-started', { task: taskId }));
  TaskTracker.on('switched', taskId => router.emit('tracking/event-started', { task: taskId }));
  TaskTracker.on('stopped', () => {

    router.emit('tracking/event-stopped', {});
    router.emit('misc/update-not-synced-amount', {});

  });
  TaskTracker.on('interval-pushed', () => router.emit('misc/update-not-synced-amount', {}));
  TaskTracker.on('interval-removed', res => {

    router.emit('tracking/interval-removed', { interval: res });
    router.emit('misc/update-not-synced-amount', {});

  });
  TaskTracker.on('screenshot-capture-failed', () => router.emit('misc/ui-notification', { type: 'error', message: 'Error during screenshot capture' }));

};
