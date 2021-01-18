module.exports = (sequelize, DataTypes) => {

  const Track = sequelize.define('Track', {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },

    // Date of this track
    day: DataTypes.DATE,

    // Identifier of the tracked task
    taskId: DataTypes.UUID,

    // Overall tracked time
    overallTime: DataTypes.INTEGER,

  }, {});

  // Building relations
  Track.associate = models => Track.belongsTo(models.Task, { foreignKey: 'taskId' });

  // Returning model
  return Track;

};
