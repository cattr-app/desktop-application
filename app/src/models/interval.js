module.exports = (sequelize, DataTypes) => {

  const Interval = sequelize.define('Interval', {

    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV1,
    },

    // Remote identifier of the related task
    taskId: DataTypes.STRING,

    // Timestamp of the moment when this interval was started
    startAt: DataTypes.DATE,

    // Timestamp of the moment when this interval was finished
    endAt: DataTypes.DATE,

    // Percent of system activity
    systemActivity: DataTypes.INTEGER,

    // Percent of keyboard activity
    keyboardActivity: DataTypes.INTEGER,

    // Percent of mouse activity
    mouseActivity: DataTypes.INTEGER,

    // Associated screenshot in JPEG
    screenshot: DataTypes.BLOB,

    // Associated user ID
    userId: DataTypes.INTEGER,

    // Is this interval synced?
    synced: DataTypes.BOOLEAN,

    // Identifier of this interval on remote
    remoteId: DataTypes.STRING,

  }, {});

  // Building relations
  Interval.associate = models => {

    Interval.belongsTo(models.Task);
    Interval.hasOne(models.Task, { foreignKey: 'externalId', sourceKey: 'taskId' });

  };

  // Return model
  return Interval;

};
