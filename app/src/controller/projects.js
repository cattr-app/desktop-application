const EventEmitter = require('events');
const api = require('../base/api');
const database = require('../models').db.models;
const OfflineMode = require('../base/offline-mode');
const Log = require('../utils/log');

const log = new Log('Projects');
const projectEmitter = new EventEmitter();

/**
 * Formats projects for local storage
 * @param   {Object}  projects            Object of project objects received from server
 * @return  {Array}   formattedProjects   Array of formatted projects
 */
function formatProjects(projects) {

  const formatted = [];
  projects.forEach(project => {

    formatted.push({
      externalId: project.id,
      externalUrl: null,
      name: project.name,
      description: project.description,
      source: project.source,
      updatedAt: project.updatedAt,
      screenshotsState: project.screenshotsState,
    });

  });

  return formatted;

}

/**
 * Sync local DB with remote storage
 * @param {Object[]} offlineProjects
 * @return {Promise<Promise<Model<any, any>[]>>} syncedProjects Synced (actualized) projects from local storage
 */
module.exports.syncProjects = async (offlineProjects = null) => {

  // Handle offline launch case
  if (OfflineMode.enabled && offlineProjects == null) {

    log.warning('Intercepting projects sync request due to offline mode');
    return database.Project.findAll();

  }

  const projectOptions = {};
  let actualProjects = null;

  try {

    if (offlineProjects == null) {
      actualProjects = await api.projects.list(projectOptions);
      OfflineMode.restoreWithCheck();
    } else {
      actualProjects = offlineProjects;
    }

  } catch (err) {

    if (err instanceof api.NetworkError) {

      log.warning('Connectivity error detected, triggering offline mode');
      OfflineMode.trigger();

    } else if (err instanceof api.ApiError) {
      log.warning('ApiError error detected, triggering offline mode');
      OfflineMode.trigger();
    }

    log.warning(`Intercepting projects listing fetch, due to error: ${err}`);
    return database.Project.findAll();

  }

  const actualProjectsFormatted = formatProjects(actualProjects);

  const toUpdate = {};
  const toCreate = [];
  const toDelete = [];

  const localProjects = await database.Project.findAll();
  const localProjectsNumber = localProjects.length;

  // If there are no any local projects
  if (localProjectsNumber === 0) {

    await database.Project.bulkCreate(actualProjectsFormatted);
    return database.Project.findAll();

  }

  actualProjectsFormatted.forEach(actualProject => {

    let found = false;

    localProjects.forEach(localProject => {

      // Skipping iteration, if the match for actualProject already found
      if (found)
        return;

      // Skpping iteration, if project identifiers aren't match
      if (String(localProject.externalId) !== String(actualProject.externalId))
        return;

      // Checking differnce in last update time or screenshots state between local and remote entries
      if (Date.parse(localProject.updatedAt) < Date.parse(actualProject.updatedAt) || localProject.screenshotsState !== actualProject.screenshotsState) {}
        toUpdate[actualProject.externalId] = actualProject;

      // Set the "found" flag
      found = true;

    });

    if (!found)
      toCreate.push(actualProject);

  });


  const actualProjectsFormattedIDs = actualProjectsFormatted.map(p => p.externalId);

  localProjects.forEach(project => {

    if (!actualProjectsFormattedIDs.includes(parseInt(project.externalId, 10)))
      toDelete.push(project.externalId);

  });

  // Should we create something new?
  if (toCreate.length > 0)
    await database.Project.bulkCreate(toCreate);

  // .. or should we remove existing entities?
  if (toDelete.length > 0)
    await database.Project.destroy({where: {externalId: toDelete}});

  // Return all current entries if there are nothing to update
  if (Object.keys(toUpdate).length === 0)
    return database.Project.findAll();

  // Performing update routine
  const results = Object
    .values(toUpdate)
    .map(project => database.Project.update(project, {where: {externalId: project.externalId}}));

  await Promise.all(results);
  return database.Project.findAll();

};


/**
 * Returning projects list from database
 * @return {Promise<Model<any, any>[]>|Error} Returns array of projects if succeed
 */
module.exports.getProjectsList = async () => database.Project.findAll();

module.exports.getProjectByInternalId = async internalId => database.Project.findByPk(internalId);

module.exports.events = projectEmitter;
