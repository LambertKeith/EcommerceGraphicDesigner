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
      const files = await fs.readdir(migrationsDir);
      const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();
      
      for (const file of sqlFiles) {
        const filePath = path.join(migrationsDir, file);
        const sql = await fs.readFile(filePath, 'utf-8');
        
        console.log(`Running migration: ${file}`);
        await this.query(sql);
        console.log(`Migration ${file} completed successfully`);
      }
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