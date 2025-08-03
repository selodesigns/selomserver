/**
 * SELO Media Server - Database Utility
 * Handles database connection checks and migrations
 */

const path = require('path');
const fs = require('fs-extra');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const logger = require('./logger');

/**
 * Check database status and connectivity
 * @param {boolean} [detailed=false] Whether to include detailed information
 * @returns {Promise<Object>} Database status information
 */
async function getDBStatus(detailed = false) {
  const dbType = process.env.DB_TYPE || 'sqlite';
  const status = {
    type: dbType,
    connected: false
  };

  try {
    switch (dbType.toLowerCase()) {
      case 'sqlite':
        return await checkSQLiteStatus(detailed);
      case 'postgres':
      case 'postgresql':
        return await checkPostgresStatus(detailed);
      case 'mysql':
      case 'mariadb':
        return await checkMySQLStatus(detailed);
      default:
        status.error = `Unknown database type: ${dbType}`;
        status.connected = false;
        return status;
    }
  } catch (error) {
    logger.error('Database status check failed', { error: error.message });
    status.connected = false;
    status.error = error.message;
    return status;
  }
}

/**
 * Check SQLite database status
 * @param {boolean} detailed Include detailed information
 * @returns {Promise<Object>} Database status
 */
async function checkSQLiteStatus(detailed) {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'media.db');
  const status = {
    type: 'sqlite',
    path: dbPath,
    connected: false
  };

  try {
    // Check if database file exists
    status.exists = await fs.pathExists(dbPath);
    
    if (!status.exists) {
      status.error = 'Database file does not exist';
      return status;
    }

    // Check if file is readable/writable
    try {
      await fs.access(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      status.permissions = 'read-write';
    } catch (err) {
      status.permissions = 'read-only';
      status.warning = 'Database file is read-only, this may cause issues';
    }

    // Try to open the database
    const db = await new Promise((resolve, reject) => {
      const database = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) reject(err);
        else resolve(database);
      });
    });

    // Check schema version
    const schemaVersion = await new Promise((resolve, reject) => {
      db.get("PRAGMA user_version", (err, row) => {
        if (err) reject(err);
        else resolve(row.user_version);
      });
    });
    
    status.schemaVersion = schemaVersion;
    status.connected = true;

    // If detailed, get table counts
    if (detailed) {
      const tables = await new Promise((resolve, reject) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.name));
        });
      });

      status.tables = tables;
      
      // Get row counts for main tables
      status.counts = {};
      
      for (const table of tables) {
        if (table.startsWith('sqlite_')) continue;
        
        const count = await new Promise((resolve, reject) => {
          db.get(`SELECT COUNT(*) as count FROM "${table}"`, (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.count : 0);
          });
        });
        
        status.counts[table] = count;
      }
      
      // Get file size
      const stats = await fs.stat(dbPath);
      status.fileSize = formatBytes(stats.size);
      
      // Get last modified time
      status.lastModified = stats.mtime;
    }

    // Close the database
    await new Promise((resolve) => {
      db.close(() => resolve());
    });

    return status;
  } catch (error) {
    status.connected = false;
    status.error = error.message;
    return status;
  }
}

/**
 * Check PostgreSQL database status
 * @param {boolean} detailed Include detailed information
 * @returns {Promise<Object>} Database status
 */
async function checkPostgresStatus(detailed) {
  const status = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'selomedia',
    user: process.env.DB_USER || 'postgres',
    connected: false
  };

  try {
    // Create connection pool
    const config = {
      host: status.host,
      port: status.port,
      database: status.database,
      user: status.user,
      password: process.env.DB_PASSWORD,
      // Connection timeout of 3 seconds
      connectionTimeoutMillis: 3000
    };
    
    const pool = new Pool(config);
    
    // Test connection
    const client = await pool.connect();
    status.connected = true;
    
    // Get PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    status.version = versionResult.rows[0].version;
    
    // Get database size
    const sizeResult = await client.query('SELECT pg_size_pretty(pg_database_size($1)) as size', [status.database]);
    status.size = sizeResult.rows[0].size;
    
    if (detailed) {
      // Get list of schemas
      const schemasResult = await client.query(`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      `);
      status.schemas = schemasResult.rows.map(row => row.schema_name);
      
      // Get list of tables and row counts
      const tablesResult = await client.query(`
        SELECT 
          schemaname,
          relname as tablename,
          n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `);
      
      status.tables = tablesResult.rows.map(row => ({
        schema: row.schemaname,
        name: row.tablename,
        rowCount: parseInt(row.row_count, 10)
      }));
      
      // Check database connections
      const connectionsResult = await client.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections
        FROM pg_stat_activity
        WHERE datname = $1
      `, [status.database]);
      
      status.connections = {
        total: parseInt(connectionsResult.rows[0].total_connections, 10),
        active: parseInt(connectionsResult.rows[0].active_connections, 10)
      };
    }
    
    // Release client
    client.release();
    
    // Close pool
    await pool.end();
    
    return status;
  } catch (error) {
    status.connected = false;
    status.error = error.message;
    return status;
  }
}

/**
 * Check MySQL/MariaDB database status
 * @param {boolean} detailed Include detailed information
 * @returns {Promise<Object>} Database status
 */
async function checkMySQLStatus(detailed) {
  const status = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'selomedia',
    user: process.env.DB_USER || 'root',
    connected: false
  };

  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: status.host,
      port: status.port,
      user: status.user,
      password: process.env.DB_PASSWORD,
      database: status.database,
      connectTimeout: 3000
    });
    
    status.connected = true;
    
    // Get MySQL version
    const [versionResult] = await connection.query('SELECT VERSION() as version');
    status.version = versionResult[0].version;
    
    // Get database collation
    const [collationResult] = await connection.query(`
      SELECT DEFAULT_CHARACTER_SET_NAME as charset, DEFAULT_COLLATION_NAME as collation
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME = ?
    `, [status.database]);
    
    if (collationResult.length > 0) {
      status.charset = collationResult[0].charset;
      status.collation = collationResult[0].collation;
    }
    
    if (detailed) {
      // Get table list and row counts
      const [tablesResult] = await connection.query(`
        SELECT 
          TABLE_NAME as name, 
          TABLE_ROWS as row_count,
          DATA_LENGTH + INDEX_LENGTH as size_bytes,
          ENGINE as engine
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
      `, [status.database]);
      
      status.tables = tablesResult.map(row => ({
        name: row.name,
        rowCount: row.row_count,
        size: formatBytes(row.size_bytes),
        engine: row.engine
      }));
      
      // Get connection status
      const [connectionsResult] = await connection.query(`
        SHOW STATUS WHERE Variable_name IN 
        ('Threads_connected', 'Max_used_connections', 'Connections')
      `);
      
      status.connections = connectionsResult.reduce((acc, row) => {
        acc[row.Variable_name] = row.Value;
        return acc;
      }, {});
    }
    
    // Close connection
    await connection.end();
    
    return status;
  } catch (error) {
    status.connected = false;
    status.error = error.message;
    return status;
  }
}

/**
 * Run database migrations using the advanced migration system
 */
async function runMigrations() {
try {
const { migrationManager } = require('./migrations');
  
logger.info('Starting database migration process');
  
const result = await migrationManager.runMigrations();
  
if (result.success) {
logger.info(`Migration completed: ${result.message}`);
} else {
logger.error(`Migration failed: ${result.error || 'Unknown error'}`);
}
  
return result;
} catch (error) {
logger.error('Database migration failed', { error: error.message });
throw error;
}
}

/**
 * Format bytes to human readable format
 * @param {number} bytes Number of bytes
 * @param {number} decimals Number of decimal places
 * @returns {string} Formatted string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = {
  getDBStatus,
  runMigrations
};
