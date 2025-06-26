const { DataTypes } = require('sequelize');

/**
 * Library model representing a media library section
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object} Sequelize model
 */
module.exports = (sequelize) => {
  const Library = sequelize.define('Library', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('movies', 'tv', 'music'),
      allowNull: false
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_scan: {
      type: DataTypes.DATE,
      defaultValue: null
    }
  });

  /**
   * Define associations with other models
   * @param {Object} models - All registered models
   */
  Library.associate = function(models) {
    // A Library has many Media items
    Library.hasMany(models.Media, {
      foreignKey: 'library_id',
      as: 'media'
    });
  };

  return Library;
};
