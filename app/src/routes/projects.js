const Logger = require('../utils/log');
const Projects = require('../controller/projects');
const { UIError } = require('../utils/errors');

const log = new Logger('Router:Projects');
log.debug('Loaded');

/**
 * Truncates all uneccessery fields from Sequelize objects
 * @param  {Array<Model>} instances [description]
 * @return {Array<Objects>}           [description]
 */
const purifyInstances = instances => instances.map(i => Object.assign(i.dataValues));

module.exports = router => {

  // Sync projects from server
  router.serve('projects/sync', async request => {

    try {

      // Starting sync routine
      log.debug('Projects sync initiated by renderer');
      const projects = await Projects.syncProjects();

      // Returning response
      log.debug('Projects successfully synced');
      return request.send(200, { projects: purifyInstances(projects) });

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        return request.send(error.code, { message: error.message, id: error.errorId });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured in projects sync route', error);
      request.send(500, { message: 'Internal error occured', id: 'ERTP500' });

      return false;

    }

  });

  // Returns list of project from local database
  router.serve('projects/list', async request => {

    try {

      // Starting sync routine
      log.debug('Local projects fetch initiated by renderer');
      const projects = await Projects.getProjectsList();

      // Returning response
      log.debug('Projects successfully fetched from local databasse');
      return request.send(200, { projects: purifyInstances(projects) });

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        return request.send(error.code, { message: error.message, id: error.errorId });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured in projects list route', error);
      request.send(500, { message: 'Internal error occured', id: 'ERTP501' });

      return false;

    }

  });

};
