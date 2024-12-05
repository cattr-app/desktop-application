const Logger = require('../utils/log');
const Projects = require('../controller/projects');
const {UIError} = require('../utils/errors');
const auth = require("../base/authentication");

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

      const currentUser = await auth.getCurrentUser();

      if (request.packet.body?.offlineImport && currentUser?.id) {
        if (typeof request.packet.body.offlineImport.id !== 'number'
          || !Array.isArray(request.packet.body.offlineImport.projects)) {
          throw new UIError(400, 'Wrong format', 'ERPS400');
        }
        if (request.packet.body.offlineImport.id !== currentUser.id) {
          throw new UIError(400, 'Unable to import data from another user', 'ERPS401');
        }
      }

      // Starting sync routine
      log.debug('Projects sync initiated by renderer');
      const projects = await Projects.syncProjects(request.packet.body?.offlineImport?.projects);

      // Returning response
      log.debug('Projects successfully synced');
      return request.send(200, {projects: purifyInstances(projects)});

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        // {error: error.error} means we are passing error that initially triggered UIError
        return request.send(error.code, {
          message: error.message,
          id: error.errorId,
          error: error.error == null ? error.error : JSON.parse(JSON.stringify(error.error))
        });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured in projects sync route', error);
      request.send(500, {message: 'Internal error occured', id: 'ERTP500'});

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
      return request.send(200, {projects: purifyInstances(projects)});

    } catch (error) {

      // Pass UIErrors directly to renderer
      if (error instanceof UIError)
        // {error: error.error} means we are passing error that initially triggered UIError
        return request.send(error.code, {
          message: error.message,
          id: error.errorId,
          error: error.error == null ? error.error : JSON.parse(JSON.stringify(error.error))
        });

      // It'll be extremely weird if real errors will occur there. We should log them.
      log.error('Operating error occured in projects list route', error);
      request.send(500, {message: 'Internal error occured', id: 'ERTP501'});

      return false;

    }

  });

};
