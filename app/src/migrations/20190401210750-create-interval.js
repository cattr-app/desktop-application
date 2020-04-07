module.exports = {

  // Migration apply flow
  up: (queryInterface, Sequelize) => queryInterface.createTable('Intervals', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    taskId: { type: Sequelize.UUID },
    capturedAt: { type: Sequelize.DATE },
    length: { type: Sequelize.INTEGER },
    eventsMouse: { type: Sequelize.INTEGER },
    eventsKeyboard: { type: Sequelize.INTEGER },
    screenshot: { type: Sequelize.BLOB },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
    deletedAt: { type: Sequelize.DATE, allowNull: true },

  }),

  // Migration rollback flow
  down: queryInterface => queryInterface.dropTable('Intervals'),

};
