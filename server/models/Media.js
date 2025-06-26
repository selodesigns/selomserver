const { DataTypes } = require('sequelize');

/**
 * Media model representing a media file in the library
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object} Sequelize model
 */
module.exports = (sequelize) => {
  const Media = sequelize.define('Media', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    relative_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER, // Duration in seconds
      allowNull: true
    },
    video_codec: {
      type: DataTypes.STRING,
      allowNull: true
    },
    audio_codec: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resolution: {
      type: DataTypes.STRING, // e.g., "1920x1080"
      allowNull: true
    },
    thumbnail_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    library_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    file_modified: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  /**
   * Define associations with other models
   * @param {Object} models - All registered models
   */
  Media.associate = function(models) {
    // Media belongs to a Library
    Media.belongsTo(models.Library, {
      foreignKey: 'library_id',
      as: 'library'
    });

    // Media can have many Streams
    Media.hasMany(models.Stream, {
      foreignKey: 'media_id',
      as: 'streams'
    });
  };

  return Media;
};
