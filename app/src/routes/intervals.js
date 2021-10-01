const Logger = require('../utils/log');
const Interval = require('../controller/time-intervals');
const TaskTracker = require('../base/task-tracker');

const log = new Logger('Router:Intervals');

module.exports = router => {

  /* Returns instances from the latest intervals queue */
  router.serve('interval/get-intervals-queue', async req => {

    try {

      // Get latest intervals from queue
      let intervals = (await Interval.fetchIntervalsQueue());

      // Encode screenshots in Base64
      intervals = intervals.map(interval => {

        const instance = { ...interval.dataValues };

        if (instance.screenshot)
          instance.screenshot = interval.screenshot.toString('base64');

        if (instance.Task)
          instance.Task = { ...instance.Task.dataValues };

        return instance;

      });

      return req.send(200, intervals);

    } catch (err) {

      log.error('ERTINT00', 'Error occured during interval queue fetch', err);
      return req.send(500, { message: 'Error occured during interval queue fetch' });

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
      return req.send(500, { message: 'Error occured interval removal' });

    }

  });

  log.debug('Loaded');

};
