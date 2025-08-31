import { Pool, PoolClient } from 'pg';
import fs from 'fs/promises';
import path from 'path';

export class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async runMigrations(): Promise<void> {
    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    try {
      // Create migrations tracking table if it doesn't exist
      await this.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      const files = await fs.readdir(migrationsDir);
      const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();
      
      for (const file of sqlFiles) {
        // Check if migration has already been applied
        const version = file.replace('.sql', '');
        const existingMigration = await this.query(
          'SELECT version FROM schema_migrations WHERE version = $1',
          [version]
        );
        
        if (existingMigration.rows.length > 0) {
          console.log(`Migration ${file} already applied, skipping`);
          continue;
        }

        const filePath = path.join(migrationsDir, file);
        const sql = await fs.readFile(filePath, 'utf-8');
        
        console.log(`Running migration: ${file}`);
        
        // Execute migration in a transaction
        const client = await this.getClient();
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (version) VALUES ($1)',
            [version]
          );
          await client.query('COMMIT');
          console.log(`Migration ${file} completed successfully`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
      
      console.log('Database migrations completed');
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = new Database();