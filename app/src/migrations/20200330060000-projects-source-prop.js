module.exports = {

  up: (queryInterface, Sequelize) => queryInterface.addColumn('Projects', 'source', { type: Sequelize.STRING }),
  down: queryInterface => queryInterface.removeColumn('Projects', 'source'),

};
