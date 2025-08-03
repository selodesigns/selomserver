/**
 * Migration: Initial Schema
 * Created: 2025-01-02T20:15:00.000Z
 * Description: Creates the initial database schema with all core tables
 */

module.exports = {
  /**
   * Run the migration
   */
  async up(queryInterface, Sequelize) {
    // Create Users table
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_admin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create Libraries table
    await queryInterface.createTable('Libraries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('movies', 'tv', 'music'),
        allowNull: false
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      last_scan: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create Media table
    await queryInterface.createTable('Media', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      library_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Libraries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      path: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      type: {
        type: Sequelize.ENUM('movie', 'episode', 'song'),
        allowNull: false
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      resolution: {
        type: Sequelize.STRING,
        allowNull: true
      },
      codec: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bitrate: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      thumbnail_path: {
        type: Sequelize.STRING,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      director: {
        type: Sequelize.STRING,
        allowNull: true
      },
      actors: {
        type: Sequelize.JSON,
        allowNull: true
      },
      genre: {
        type: Sequelize.STRING,
        allowNull: true
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      rating: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create Streams table
    await queryInterface.createTable('Streams', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      stream_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      media_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Media',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'stopped', 'error'),
        defaultValue: 'active'
      },
      quality: {
        type: Sequelize.STRING,
        allowNull: true
      },
      transcoding_preset: {
        type: Sequelize.STRING,
        allowNull: true
      },
      client_info: {
        type: Sequelize.JSON,
        allowNull: true
      },
      started_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      ended_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for better performance
    await queryInterface.addIndex('Media', ['library_id']);
    await queryInterface.addIndex('Media', ['type']);
    await queryInterface.addIndex('Media', ['title']);
    await queryInterface.addIndex('Streams', ['media_id']);
    await queryInterface.addIndex('Streams', ['user_id']);
    await queryInterface.addIndex('Streams', ['status']);
    await queryInterface.addIndex('Users', ['username']);
    await queryInterface.addIndex('Users', ['email']);
  },

  /**
   * Rollback the migration
   */
  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryInterface.dropTable('Streams');
    await queryInterface.dropTable('Media');
    await queryInterface.dropTable('Libraries');
    await queryInterface.dropTable('Users');
  }
};
