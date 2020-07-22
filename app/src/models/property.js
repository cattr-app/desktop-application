module.exports = (sequelize, DataTypes) => {

  const Property = sequelize.define('Property', {

    // UUID
    id: {

      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,

    },

    // External project identifier (in API)
    key: DataTypes.STRING,

    // Direct link to the external task location (i.e. card in Trello or issue in Redmine)
    value: DataTypes.STRING,

  }, { timestamps: true, paranoid: true });

  // Return model
  return Property;

};
