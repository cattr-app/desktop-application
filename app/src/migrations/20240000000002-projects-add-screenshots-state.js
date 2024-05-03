module.exports = {

  up: async (queryInterface, Sequelize) => {

    await queryInterface.addColumn('Projects', 'screenshotsState', {
      type: Sequelize.TINYINT,
      allowNull: true,
      defaultValue: null,
    });

  },

  down: queryInterface => queryInterface.removeColumn('Projects', 'screenshotsState'),

};
