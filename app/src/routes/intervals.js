const Logger = require('../utils/log');
const Interval = require('../controller/time-intervals');
const TaskTracker = require('../base/task-tracker');
const {zip} = require("fflate");
const log = new Logger('Router:Intervals');

module.exports = router => {

  /* Returns instances from the latest intervals queue */
  router.serve('interval/get-intervals-queue', async req => {

    try {

      // Get latest intervals from queue
      let intervals = (await Interval.fetchIntervalsQueue());

      // Encode screenshots in Base64
      intervals = intervals.map(interval => {

        const instance = {...interval.dataValues};

        if (instance.screenshot)
          instance.screenshot = interval.screenshot.toString('base64');

        if (instance.Task)
          instance.Task = {...instance.Task.dataValues};

        return instance;

      });

      return req.send(200, intervals);

    } catch (err) {

      log.error('ERTINT00', 'Error occured during interval queue fetch', err);
      return req.send(500, {message: 'Error occured during interval queue fetch'});

    }

  });

  /* Remove interval from queue */
  router.serve('interval/remove', async req => {

    try {

      await Interval.removeInterval(req.packet.body.task.intervalId);

      TaskTracker.emit('interval-removed', req.packet.body);

      return req.send(204, {});

    } catch (err) {

      log.error('ERTINT01', 'Error occured during interval removal from queue', err);
      return req.send(500, {message: 'Error occured interval removal'});

    }

  });

  /* Get not synced intervals amount */
  router.serve('interval/not-synced-amount', async req => {

    try {

      const amount = (await Interval.fetchNotSyncedIntervalsAmount());

      return req.send(200, {amount});

    } catch (err) {

      log.error('ERTINT02', 'Error occurred during not synced intervals amount fetch', err);
      return req.send(500, {message: 'Error occurred during not synced intervals amount fetch'});

    }

  });

  /* Get not synced intervals amount */
  router.serve('interval/not-synced-screenshots-amount', async req => {

    try {

      const amount = (await Interval.fetchNotSyncedScreenshotsAmount());

      return req.send(200, {amount});

    } catch (err) {

      log.error('ERTINT02', 'Error occurred during not synced screenshots amount fetch', err);
      return req.send(500, {message: 'Error occurred during not synced screenshots amount fetch'});

    }

  });

  /* Get not synced intervals */
  router.serve('interval/export-deferred', async req => {

    try {

      const intervals = (await Interval.fetchNotSyncedIntervals())
        .map(interval => ({
          ...interval.dataValues,
          start_at: new Date(interval.dataValues.start_at).toISOString(),
          end_at: new Date(interval.dataValues.end_at).toISOString()
        }));

      return req.send(200, intervals);

    } catch (error) {

      error.context = {};
      const crypto = require("crypto");
      error.context.client_trace_id = crypto.randomUUID();

      log.error('ERTINT03', 'Error occurred during not synced intervals fetch', error);
      return req.send(500, {
          message: 'Error occurred during not synced intervals fetch',
          error: JSON.parse(JSON.stringify(error)),
        }
      );

    }

  });

  /* Get not synced intervals */
  router.serve('interval/export-deferred-screenshots', async req => {

    try {
      const screenshots = (await Interval.fetchNotSyncedScreenshots())
        .reduce((acc, {dataValues}) => {
          const el = dataValues;
          const key = `${el.user_id}_${el.screenshot_id}`
          acc[key] = el.screenshot;
          return acc;
        }, {});

      zip(screenshots, {
        level: 1,
        mtime: new Date()
      }, async (error, data) => {
        // Save the ZIP file
        if (error) {
          error.context = {};
          const crypto = require("crypto");
          error.context.client_trace_id = crypto.randomUUID();

          log.error('ERTINT03', 'Screenshots zipping error', error);
          return req.send(500, {
              message: 'Screenshots zipping error',
              error: JSON.parse(JSON.stringify(error)),
            }
          );
        }
        return req.send(200, data);
      })
    } catch (error) {
      error.context = {};
      const crypto = require("crypto");
      error.context.client_trace_id = crypto.randomUUID();

      log.error('ERTINT03', 'Error occurred during not synced intervals fetch', error);
      return req.send(500, {
          message: 'Error occurred during not synced intervals fetch',
          error: JSON.parse(JSON.stringify(error)),
        }
      );

    }

  });

  log.debug('Loaded');

};
