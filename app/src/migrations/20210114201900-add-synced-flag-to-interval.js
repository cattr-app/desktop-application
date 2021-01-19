module.exports = {

  up: async (queryInterface, Sequelize) => {

    queryInterface.addColumn('Intervals', 'synced', {

      type: Sequelize.BOOLEAN,
      defaultValue: false,

    });

  },

  down: queryInterface => queryInterface.removeColumn('Intervals', 'pinOrder'),

};
