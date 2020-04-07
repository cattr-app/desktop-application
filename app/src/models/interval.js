
module.exports = (sequelize, DataTypes) => {

  const Interval = sequelize.define('Interval', {

    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },

    // Parent task UUID
    taskId: DataTypes.UUID,

    // Timestamp of the moment when this interval was started
    startAt: DataTypes.DATE,

    // Timestamp of the moment when this interval was finished
    endAt: DataTypes.DATE,

    // Counted mouse events
    eventsMouse: DataTypes.INTEGER,

    // Counted keyboard events
    eventsKeyboard: DataTypes.INTEGER,

    // Associated screenshot in JPEG
    screenshot: DataTypes.BLOB,

    // Associated user ID
    userId: DataTypes.INTEGER,

  }, {});

  // Building relations
  Interval.associate = models => Interval.belongsTo(models.Task, { foreignKey: 'taskId' });

  // Return model
  return Interval;

};
