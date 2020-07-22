module.exports = {

  up: (queryInterface, Sequelize) => queryInterface.createTable('Tracks', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    day: { type: Sequelize.DATE },
    taskId: { type: Sequelize.UUID },
    overallTime: { type: Sequelize.INTEGER },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
    deletedAt: { type: Sequelize.DATE, allowNull: true },

  }),

  down: queryInterface => queryInterface.dropTable('Tracks'),

};
