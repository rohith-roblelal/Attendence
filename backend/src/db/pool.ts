import mysql from 'mysql2/promise';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: parseInt(env.DB_PORT, 10),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ Successfully connected to the database.');
    connection.release();
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to connect to the database.');
    process.exit(1);
  }
};
