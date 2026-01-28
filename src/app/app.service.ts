import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class AppService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  async clearDatabase(): Promise<{ message: string; tablesCleared: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Get all table names
      const tables = await queryRunner.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `);

      if (tables.length === 0) {
        return {
          message: 'No tables found in database',
          tablesCleared: 0,
        };
      }

      // Disable foreign key checks temporarily
      await queryRunner.query('SET session_replication_role = replica;');

      // Clear all tables
      let clearedCount = 0;
      for (const table of tables) {
        const tableName = table.tablename;
        try {
          await queryRunner.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
          clearedCount++;
        } catch (error: any) {
          console.error(`Failed to clear ${tableName}:`, error.message);
        }
      }

      // Re-enable foreign key checks
      await queryRunner.query('SET session_replication_role = DEFAULT;');

      // Reset sequences
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

      return {
        message: `Database cleared successfully. ${clearedCount} tables cleared.`,
        tablesCleared: clearedCount,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
