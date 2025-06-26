const { DataTypes } = require('sequelize');

/**
 * Stream model representing an active or historical media stream
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object} Sequelize model
 */
module.exports = (sequelize) => {
  const Stream = sequelize.define('Stream', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    stream_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    media_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'paused', 'completed', 'error'),
      defaultValue: 'pending'
    },
    transcoding_settings: {
      type: DataTypes.JSON,
      allowNull: true
    },
    started_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  /**
   * Define associations with other models
   * @param {Object} models - All registered models
   */
  Stream.associate = function(models) {
    // Stream belongs to a Media
    Stream.belongsTo(models.Media, {
      foreignKey: 'media_id',
      as: 'media'
    });

    // Stream belongs to a User
    Stream.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return Stream;
};
