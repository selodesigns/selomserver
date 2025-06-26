const { DataTypes } = require('sequelize');

/**
 * User model representing a system user
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object} Sequelize model
 */
module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  /**
   * Define associations with other models
   * @param {Object} models - All registered models
   */
  User.associate = function(models) {
    // User can have many Streams
    User.hasMany(models.Stream, {
      foreignKey: 'user_id',
      as: 'streams'
    });
  };

  return User;
};
