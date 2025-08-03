const fs = require('fs-extra');
const path = require('path');
const { getSequelize } = require('./database');
const { logger } = require('./Logger');

/**
 * Advanced Database Migration System
 * Provides versioned migrations with rollback capabilities
 */

class MigrationManager {
  constructor() {
    this.sequelize = getSequelize();
    this.migrationsDir = path.join(__dirname, '../migrations');
    this.migrationTableName = 'schema_migrations';
  }

  /**
   * Initialize the migration system
   */
  async initialize() {
    try {
      // Ensure migrations directory exists
      await fs.ensureDir(this.migrationsDir);
      
      // Create migration tracking table
      await this.createMigrationTable();
      
      logger.info('Migration system initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize migration system:', error);
      throw error;
    }
  }

  /**
   * Create the schema_migrations table to track applied migrations
   */
  async createMigrationTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.migrationTableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time INTEGER
      )
    `;
    
    await this.sequelize.query(query);
  }

  /**
   * Get all available migration files
   */
  async getAvailableMigrations() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.js'))
        .sort()
        .map(file => {
          const version = file.split('_')[0];
          const name = file.replace(/^\d+_/, '').replace('.js', '');
          return {
            version,
            name,
            filename: file,
            path: path.join(this.migrationsDir, file)
          };
        });
      
      return migrationFiles;
    } catch (error) {
      logger.error('Error reading migration files:', error);
      return [];
    }
  }

  /**
   * Get applied migrations from database
   */
  async getAppliedMigrations() {
    try {
      const [results] = await this.sequelize.query(
        `SELECT version, name, applied_at, checksum FROM ${this.migrationTableName} ORDER BY version`
      );
      return results;
    } catch (error) {
      logger.error('Error fetching applied migrations:', error);
      return [];
    }
  }

  /**
   * Get pending migrations that need to be applied
   */
  async getPendingMigrations() {
    const available = await this.getAvailableMigrations();
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));
    
    return available.filter(migration => !appliedVersions.has(migration.version));
  }

  /**
   * Calculate checksum for a migration file
   */
  async calculateChecksum(filePath) {
    const crypto = require('crypto');
    const content = await fs.readFile(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    try {
      await this.initialize();
      
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations to run');
        return {
          success: true,
          migrationsRun: 0,
          message: 'Database is up to date'
        };
      }

      logger.info(`Running ${pendingMigrations.length} pending migrations`);
      
      const results = [];
      
      for (const migration of pendingMigrations) {
        const result = await this.runSingleMigration(migration);
        results.push(result);
        
        if (!result.success) {
          logger.error(`Migration ${migration.version} failed, stopping migration process`);
          break;
        }
      }
      
      const successfulMigrations = results.filter(r => r.success).length;
      
      return {
        success: successfulMigrations === pendingMigrations.length,
        migrationsRun: successfulMigrations,
        results,
        message: `Successfully applied ${successfulMigrations}/${pendingMigrations.length} migrations`
      };
    } catch (error) {
      logger.error('Migration process failed:', error);
      return {
        success: false,
        migrationsRun: 0,
        error: error.message
      };
    }
  }

  /**
   * Run a single migration
   */
  async runSingleMigration(migration) {
    const startTime = Date.now();
    const transaction = await this.sequelize.transaction();
    
    try {
      logger.info(`Running migration: ${migration.version} - ${migration.name}`);
      
      // Load and execute migration
      const migrationModule = require(migration.path);
      
      if (typeof migrationModule.up !== 'function') {
        throw new Error(`Migration ${migration.version} does not export an 'up' function`);
      }
      
      // Execute migration within transaction
      await migrationModule.up(this.sequelize.getQueryInterface(), this.sequelize);
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(migration.path);
      const executionTime = Date.now() - startTime;
      
      // Record migration as applied
      await this.sequelize.query(
        `INSERT INTO ${this.migrationTableName} (version, name, checksum, execution_time) VALUES (?, ?, ?, ?)`,
        {
          replacements: [migration.version, migration.name, checksum, executionTime],
          transaction
        }
      );
      
      await transaction.commit();
      
      logger.info(`Migration ${migration.version} completed successfully in ${executionTime}ms`);
      
      return {
        success: true,
        version: migration.version,
        name: migration.name,
        executionTime
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Migration ${migration.version} failed:`, error);
      
      return {
        success: false,
        version: migration.version,
        name: migration.name,
        error: error.message
      };
    }
  }

  /**
   * Rollback the last applied migration
   */
  async rollbackLastMigration() {
    try {
      const applied = await this.getAppliedMigrations();
      
      if (applied.length === 0) {
        return {
          success: false,
          message: 'No migrations to rollback'
        };
      }
      
      const lastMigration = applied[applied.length - 1];
      return await this.rollbackMigration(lastMigration.version);
    } catch (error) {
      logger.error('Rollback failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Rollback a specific migration
   */
  async rollbackMigration(version) {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Find migration file
      const available = await this.getAvailableMigrations();
      const migration = available.find(m => m.version === version);
      
      if (!migration) {
        throw new Error(`Migration file for version ${version} not found`);
      }
      
      logger.info(`Rolling back migration: ${version} - ${migration.name}`);
      
      // Load migration module
      const migrationModule = require(migration.path);
      
      if (typeof migrationModule.down !== 'function') {
        throw new Error(`Migration ${version} does not export a 'down' function`);
      }
      
      // Execute rollback
      await migrationModule.down(this.sequelize.getQueryInterface(), this.sequelize);
      
      // Remove from migration tracking table
      await this.sequelize.query(
        `DELETE FROM ${this.migrationTableName} WHERE version = ?`,
        {
          replacements: [version],
          transaction
        }
      );
      
      await transaction.commit();
      
      logger.info(`Migration ${version} rolled back successfully`);
      
      return {
        success: true,
        version,
        name: migration.name,
        message: `Migration ${version} rolled back successfully`
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Rollback of migration ${version} failed:`, error);
      
      return {
        success: false,
        version,
        error: error.message
      };
    }
  }

  /**
   * Get migration status
   */
  async getStatus() {
    try {
      const available = await this.getAvailableMigrations();
      const applied = await this.getAppliedMigrations();
      const pending = await this.getPendingMigrations();
      
      return {
        total: available.length,
        applied: applied.length,
        pending: pending.length,
        migrations: {
          available: available.map(m => ({ version: m.version, name: m.name })),
          applied: applied.map(m => ({ 
            version: m.version, 
            name: m.name, 
            applied_at: m.applied_at,
            checksum: m.checksum 
          })),
          pending: pending.map(m => ({ version: m.version, name: m.name }))
        }
      };
    } catch (error) {
      logger.error('Error getting migration status:', error);
      throw error;
    }
  }

  /**
   * Create a new migration file
   */
  async createMigration(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
      const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.js`;
      const filePath = path.join(this.migrationsDir, filename);
      
      const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  /**
   * Run the migration
   */
  async up(queryInterface, Sequelize) {
    // Add your migration logic here
    // Example:
    // await queryInterface.createTable('new_table', {
    //   id: {
    //     type: Sequelize.INTEGER,
    //     primaryKey: true,
    //     autoIncrement: true
    //   },
    //   name: {
    //     type: Sequelize.STRING,
    //     allowNull: false
    //   },
    //   created_at: {
    //     type: Sequelize.DATE,
    //     defaultValue: Sequelize.NOW
    //   }
    // });
  },

  /**
   * Rollback the migration
   */
  async down(queryInterface, Sequelize) {
    // Add your rollback logic here
    // Example:
    // await queryInterface.dropTable('new_table');
  }
};
`;
      
      await fs.writeFile(filePath, template);
      
      logger.info(`Created migration file: ${filename}`);
      
      return {
        success: true,
        filename,
        path: filePath
      };
    } catch (error) {
      logger.error('Error creating migration file:', error);
      throw error;
    }
  }
}

// Export singleton instance
const migrationManager = new MigrationManager();

module.exports = {
  MigrationManager,
  migrationManager,
  
  // Convenience functions
  runMigrations: () => migrationManager.runMigrations(),
  rollbackLastMigration: () => migrationManager.rollbackLastMigration(),
  rollbackMigration: (version) => migrationManager.rollbackMigration(version),
  getStatus: () => migrationManager.getStatus(),
  createMigration: (name) => migrationManager.createMigration(name)
};
