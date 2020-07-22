const fs = require('fs');
const path = require('path');
const Umzug = require('umzug');
const Sequelize = require('sequelize');
const config = require('../base/config');
const Log = require('../utils/log');

const log = new Log('Database');

module.exports.db = {};
module.exports.db.models = {};

const initMigrations = sequelize => new Promise((resolve, reject) => {

  // Setup migration engine
  const umzug = new Umzug({

    // Sequelize storage dialect
    storage: 'sequelize',
    storageOptions: { sequelize },

    // Define migration settings
    migrations: {
      params: [
        sequelize.getQueryInterface(),
        sequelize.constructor,
        () => reject(new Error('Unexpected callback-styled migrations')),
      ],
      path: path.resolve(__dirname, '..', 'migrations'),
      pattern: /\.js$/,
    },

  });

  // Run migrations
  umzug.up().then(() => {

    // Reading all files in this directory
    fs.readdirSync(path.resolve(__dirname))

      // Filter only JavaScript source files except this one
      .filter(f => ((f.indexOf('.') !== 0) && (f !== path.basename(__filename)) && (f.slice(-3) === '.js')))

      // Import all of them as Sequelize models
      .forEach(file => {

        // eslint-disable-next-line global-require, import/no-dynamic-require
        const model = require(path.resolve(__dirname, './', file))(sequelize, Sequelize.DataTypes);
        module.exports.db.models[model.name] = model;

      });


    // Iterate over imported models
    Object.keys(module.exports.db.models).forEach(modelName => {

      // Building described relations
      if (module.exports.db.models[modelName].associate)
        module.exports.db.models[modelName].associate(module.exports.db.models);

    });

    // Export things
    module.exports.db.sequelize = sequelize;
    module.exports.db.Sequelize = Sequelize;

    log.debug('Migrations applied successfully');

    // Resolve promise
    return resolve();

  });

});

// Database init promise
module.exports.init = async () => {

  const sequelize = new Sequelize(config.localDB.opts);
  await sequelize.authenticate();
  await initMigrations(sequelize);
  log.debug('Database successfully initialized');
  return true;

};
