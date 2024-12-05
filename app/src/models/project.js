module.exports = (sequelize, DataTypes) => {

  const Project = sequelize.define('Project', {

    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },

    // External project identifier (in API)
    externalId: DataTypes.STRING,

    // Direct link to the external task location (i.e. card in Trello or issue in Redmine)
    externalUrl: DataTypes.STRING,

    // Human-readable project name
    name: DataTypes.STRING,

    // Human-readable project description
    description: DataTypes.TEXT,

    // Project source (like "internal" or "gitlab" / "jira" / "trello")
    source: DataTypes.STRING,

    screenshotsState: DataTypes.TINYINT,

  }, { timestamps: true, paranoid: true });

  // Define relations
  Project.associate = models => Project.hasMany(models.Task);

  // Return model
  return Project;

};
