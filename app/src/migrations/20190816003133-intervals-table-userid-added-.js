/* eslint arrow-body-style: 0 */
/* eslint implicit-arrow-linebreak: 0 */

module.exports = {

  up: (queryInterface, Sequelize) => queryInterface.addColumn('Intervals', 'userId', {

    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,

  }),

  down: queryInterface => queryInterface.removeColumn('Intervals', 'userId'),

};
