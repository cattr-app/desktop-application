/* eslint arrow-body-style: 0 */
/* eslint implicit-arrow-linebreak: 0 */

module.exports = {

  up: (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(t =>
      queryInterface.renameColumn('Intervals', 'capturedAt', 'startAt', { transaction: t })
        .then(() => queryInterface.renameColumn('Intervals', 'length', 'endAt', { transaction: t }))
        .then(() => queryInterface.changeColumn('Intervals', 'endAt', { type: Sequelize.DATE }, { transaction: t }))),

  down: (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(t =>
      queryInterface.removeColumn('Intervals', 'userId', { transaction: t })
        .then(() => queryInterface.changeColumn('Intervals', 'endAt', { type: Sequelize.INTEGER }, { transaction: t }))
        .then(() => queryInterface.renameColumn('Intervals', 'endAt', 'length', { transaction: t }))
        .then(() => queryInterface.renameColumn('Intervals', 'capturedAt', 'startAt', { transaction: t }))),

};
