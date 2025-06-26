const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs-extra');
const { logger } = require('../utils/Logger');

// Path to the SQLite database file
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/media.db');

// Ensure the directory exists
fs.ensureDirSync(path.dirname(DB_PATH));

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: (msg) => logger.debug(msg),
  define: {
    timestamps: true, // Adds createdAt and updatedAt to all models
    underscored: true, // Use snake_case for fields
    freezeTableName: false // Pluralize table names
  }
});

/**
 * Initialize the database connection and sync models
 * @param {Object} options - Configuration options
 * @param {Boolean} options.force - Drop tables if they exist
 * @param {Boolean} options.alter - Alter tables to match models
 * @returns {Promise<Boolean>} - Success status
 */
async function initDatabase(options = {}) {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Import models
    const models = require('../models');
    
    // Sync models with the database
    logger.info('Synchronizing database models...');
    await sequelize.sync(options);
    logger.info('Database models synchronized successfully.');
    
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    return false;
  }
}

module.exports = { sequelize, initDatabase };
