const fs = require('fs');
const path = require('path');
const Umzug = require('umzug');
const Sequelize = require('sequelize');
const config = require('../base/config');
const Log = require('../utils/log');

const log = new Log('Database');


module.exports.db = {};
module.exports.db.models = {};

// Database init promise
module.exports.init = new Promise((resolve, reject) => {

  const database = {};
  const sequelize = new Sequelize(config.localDB.opts);

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
        () => reject(new Error('Unexpected callback-styled migrations'))
      ],
      path: `${config.apppath}/migrations`,
      pattern: /\.js$/
    }

  });

  // Run migrations
  umzug.up().then(() => {

    // Reading all files in this directory
    fs.readdirSync(`${config.apppath}/models`)

      // Filter only JavaScript source files except this one
      .filter(f => ((f.indexOf('.') !== 0) && (f !== path.basename(__filename)) && (f.slice(-3) === '.js')))

      // Import all of them as Sequelize models
      .forEach(file => {

        const model = sequelize.import(`${config.apppath}/models/${file}`);
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

    log.debug('Database successfully initliazed');

    // Resolve promise
    return resolve(database);

  });

});
