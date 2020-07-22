module.exports = {

  up: (queryInterface, Sequelize) => queryInterface.createTable('Properties', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    key: { type: String },
    value: { type: String },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
    deletedAt: { type: Sequelize.DATE, allowNull: true },
  }),

  down: queryInterface => queryInterface.dropTable('Properties'),

};
