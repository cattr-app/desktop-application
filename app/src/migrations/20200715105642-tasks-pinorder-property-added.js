module.exports = {

  up: async (queryInterface, Sequelize) => {

    queryInterface.addColumn('Tasks', 'pinOrder', {

      type: Sequelize.INTEGER,
      defaultValue: null,

    });

  },

  down: queryInterface => queryInterface.removeColumn('Tasks', 'pinOrder'),

};
