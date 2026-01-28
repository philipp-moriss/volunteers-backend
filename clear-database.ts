#!/usr/bin/env ts-node

/**
 * Script to clear all data from the database
 * Usage: npx ts-node clear-database.ts
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
config({ path: path.join(__dirname, envFile) });

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...\n');

  // Определяем, какая база используется
  const dbUrl = process.env.DATABASE_URL;
  const dbHost = process.env.DATABASE_HOST || 'localhost';
  const dbName = process.env.DATABASE_NAME || 'postgres';
  
  if (dbUrl) {
    console.log(`📡 Connecting to database via DATABASE_URL...`);
    console.log(`   Host: ${dbUrl.split('@')[1]?.split('/')[0] || 'hidden'}`);
  } else {
    console.log(`💻 Connecting to local database...`);
    console.log(`   Host: ${dbHost}`);
    console.log(`   Database: ${dbName}`);
  }
  console.log('');

  const dataSource = new DataSource({
    type: 'postgres',
    ...(dbUrl ? { url: dbUrl } : {
      host: dbHost,
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: dbName,
    }),
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✓ Connected to database\n');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Get all table names
    const tables = await queryRunner.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    if (tables.length === 0) {
      console.log('No tables found in database.');
      await queryRunner.release();
      await dataSource.destroy();
      return;
    }

    console.log(`Found ${tables.length} tables to clear:\n`);

    // Disable foreign key checks temporarily
    await queryRunner.query('SET session_replication_role = replica;');

    // Clear all tables
    for (const table of tables) {
      const tableName = table.tablename;
      try {
        await queryRunner.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
        console.log(`  ✓ Cleared: ${tableName}`);
      } catch (error: any) {
        console.log(`  ✗ Failed to clear ${tableName}: ${error.message}`);
      }
    }

    // Re-enable foreign key checks
    await queryRunner.query('SET session_replication_role = DEFAULT;');

    // Reset sequences (for auto-increment IDs if any)
    const sequences = await queryRunner.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public';
    `);

    for (const seq of sequences) {
      try {
        await queryRunner.query(`ALTER SEQUENCE "${seq.sequence_name}" RESTART WITH 1;`);
      } catch (error) {
        // Ignore sequence reset errors
      }
    }

    await queryRunner.release();

    console.log('\n✅ Database cleared successfully!');
    console.log(`\nSummary:`);
    console.log(`  - Tables cleared: ${tables.length}`);
    console.log(`  - Sequences reset: ${sequences.length}`);

  } catch (error: any) {
    console.error('\n❌ Error during database cleanup:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Tip: Check your database credentials in .env.development file');
    }
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n✓ Database connection closed');
    }
  }
}

// Run the cleanup
clearDatabase();
