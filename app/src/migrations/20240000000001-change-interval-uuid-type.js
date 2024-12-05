module.exports = {

  up: async (queryInterface, Sequelize) => {

    await queryInterface.changeColumn('Intervals', 'id', {
      defaultValue: Sequelize.UUIDV1,
    });

  },

  down: queryInterface => queryInterface.changeColumn('Intervals', 'id', {
    defaultValue: Sequelize.UUIDV4
  }),

};
