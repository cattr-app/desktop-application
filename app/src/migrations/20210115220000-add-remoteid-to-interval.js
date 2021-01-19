module.exports = {

  up: async (queryInterface, Sequelize) => {

    queryInterface.addColumn('Intervals', 'remoteId', {

      type: Sequelize.STRING,
      defaultValue: false,

    });

  },

  down: queryInterface => queryInterface.removeColumn('Intervals', 'remoteId'),

};
