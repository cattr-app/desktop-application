/**
 * Replaces invalid externalUrl with null
 * @param  {Object} instance Sequelize model instance
 */
const invalidUrlsNuller = instance => {

  // Checking URL field prescense
  if (typeof instance.externalUrl === 'undefined' || !instance.externalUrl)
    return;

  // Checking for the wrong values
  if (instance.externalUrl.toLowerCase() === 'url')
    instance.externalUrl = null; // eslint-disable-line no-param-reassign

};

module.exports = (sequelize, DataTypes) => {

  const Task = sequelize.define('Task', {

    // Parent project UUID
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },

    // Task identifier in external system
    externalId: DataTypes.STRING,

    // Direct URL to this task in external system
    externalUrl: DataTypes.STRING,

    // Status of this task in external system (in_progress / new / on_hold / etc)
    externalStatus: DataTypes.STRING,

    // Human-readable name of this task
    name: DataTypes.STRING,

    // Human-readable description
    description: DataTypes.TEXT,

    // Task priority
    priority: DataTypes.STRING,

    // Internal task status (active / inactive)
    status: DataTypes.STRING,

    // Identifier of local project
    projectId: DataTypes.UUID,

    // Pin indicator
    pinOrder: DataTypes.INTEGER,

  }, { timestamps: true, paranoid: true });

  // Build relations
  Task.associate = models => {

    // One Task belongs to one Project
    Task.belongsTo(models.Project, { foreignKey: 'projectId' });

    // One Task has many Intervals
    Task.hasMany(models.Interval, { as: 'Interval', foreignKey: 'taskId', sourceKey: 'externalId' });

    // One Task has many Tracks
    Task.hasMany(models.Track);

  };

  // Fix for various shit in URL field
  Task.addHook('beforeSave', invalidUrlsNuller);
  Task.addHook('beforeCreate', invalidUrlsNuller);
  Task.addHook('beforeUpdate', invalidUrlsNuller);
  Task.addHook('beforeUpsert', invalidUrlsNuller);

  // Return model
  return Task;

};
