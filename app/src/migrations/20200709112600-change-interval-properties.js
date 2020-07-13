module.exports = {

  up: async (queryInterface, Sequelize) => Promise.all([
    await queryInterface.removeColumn('Intervals', 'eventsMousbe'),
    await queryInterface.removeColumn('Intervals', 'eventsKeyboard'),
    await queryInterface.addColumn('Intervals', 'systemActivity', { type: Sequelize.INTEGER }),
    await queryInterface.addColumn('Intervals', 'keyboardActivity', { type: Sequelize.INTEGER }),
    await queryInterface.addColumn('Intervals', 'mouseActivity', { type: Sequelize.INTEGER }),
  ]),

  down: async (queryInterface, Sequelize) => Promise.all([
    await queryInterface.addColumn('Intervals', 'eventsMouse', { type: Sequelize.INTEGER }),
    await queryInterface.addColumn('Intervals', 'eventsKeyboard', { type: Sequelize.INTEGER }),
    await queryInterface.removeColumn('Intervals', 'systemActivity'),
    await queryInterface.removeColumn('Intervals', 'keyboardActivity'),
    await queryInterface.removeColumn('Intervals', 'mouseActivity'),
  ]),

};
