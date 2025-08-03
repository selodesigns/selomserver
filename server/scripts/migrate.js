#!/usr/bin/env node

/**
 * Database Migration CLI Tool
 * Provides command-line interface for managing database migrations
 */

const { program } = require('commander');
const { 
  runMigrations, 
  rollbackLastMigration, 
  rollbackMigration, 
  getStatus, 
  createMigration 
} = require('../utils/migrations');
const { logger } = require('../utils/Logger');

// Configure CLI program
program
  .name('migrate')
  .description('Database migration management tool')
  .version('1.0.0');

// Run migrations command
program
  .command('up')
  .description('Run all pending migrations')
  .action(async () => {
    try {
      console.log('🚀 Running database migrations...\n');
      
      const result = await runMigrations();
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        console.log(`📊 Migrations applied: ${result.migrationsRun}`);
        
        if (result.results && result.results.length > 0) {
          console.log('\n📋 Migration Details:');
          result.results.forEach(migration => {
            if (migration.success) {
              console.log(`  ✅ ${migration.version} - ${migration.name} (${migration.executionTime}ms)`);
            } else {
              console.log(`  ❌ ${migration.version} - ${migration.name}: ${migration.error}`);
            }
          });
        }
      } else {
        console.error(`❌ Migration failed: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Migration error: ${error.message}`);
      process.exit(1);
    }
  });

// Rollback last migration command
program
  .command('down')
  .description('Rollback the last applied migration')
  .action(async () => {
    try {
      console.log('⏪ Rolling back last migration...\n');
      
      const result = await rollbackLastMigration();
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        console.log(`📊 Migration ${result.version} - ${result.name} rolled back successfully`);
      } else {
        console.error(`❌ Rollback failed: ${result.message || result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Rollback error: ${error.message}`);
      process.exit(1);
    }
  });

// Rollback specific migration command
program
  .command('rollback <version>')
  .description('Rollback a specific migration by version')
  .action(async (version) => {
    try {
      console.log(`⏪ Rolling back migration ${version}...\n`);
      
      const result = await rollbackMigration(version);
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ Rollback failed: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Rollback error: ${error.message}`);
      process.exit(1);
    }
  });

// Migration status command
program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    try {
      console.log('📊 Migration Status\n');
      
      const status = await getStatus();
      
      console.log(`Total migrations: ${status.total}`);
      console.log(`Applied: ${status.applied}`);
      console.log(`Pending: ${status.pending}\n`);
      
      if (status.migrations.applied.length > 0) {
        console.log('✅ Applied Migrations:');
        status.migrations.applied.forEach(migration => {
          const appliedDate = new Date(migration.applied_at).toLocaleString();
          console.log(`  ${migration.version} - ${migration.name} (${appliedDate})`);
        });
        console.log();
      }
      
      if (status.migrations.pending.length > 0) {
        console.log('⏳ Pending Migrations:');
        status.migrations.pending.forEach(migration => {
          console.log(`  ${migration.version} - ${migration.name}`);
        });
        console.log();
      }
      
      if (status.pending === 0) {
        console.log('🎉 Database is up to date!');
      }
    } catch (error) {
      console.error(`❌ Status error: ${error.message}`);
      process.exit(1);
    }
  });

// Create new migration command
program
  .command('create <name>')
  .description('Create a new migration file')
  .action(async (name) => {
    try {
      console.log(`📝 Creating new migration: ${name}...\n`);
      
      const result = await createMigration(name);
      
      if (result.success) {
        console.log(`✅ Migration file created: ${result.filename}`);
        console.log(`📁 Path: ${result.path}`);
        console.log('\n💡 Edit the migration file to add your schema changes.');
        console.log('   Remember to implement both up() and down() functions!');
      } else {
        console.error(`❌ Failed to create migration: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Creation error: ${error.message}`);
      process.exit(1);
    }
  });

// List migrations command
program
  .command('list')
  .description('List all available migrations')
  .action(async () => {
    try {
      console.log('📋 Available Migrations\n');
      
      const status = await getStatus();
      
      if (status.migrations.available.length === 0) {
        console.log('No migrations found.');
        return;
      }
      
      console.log('All Migrations:');
      status.migrations.available.forEach(migration => {
        const isApplied = status.migrations.applied.some(applied => applied.version === migration.version);
        const statusIcon = isApplied ? '✅' : '⏳';
        const statusText = isApplied ? 'Applied' : 'Pending';
        
        console.log(`  ${statusIcon} ${migration.version} - ${migration.name} (${statusText})`);
      });
    } catch (error) {
      console.error(`❌ List error: ${error.message}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
