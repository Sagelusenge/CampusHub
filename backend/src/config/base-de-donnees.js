import mysql from 'mysql2/promise';
import { environnement } from './environnement.js';

export const baseDeDonnees = mysql.createPool({
  host: environnement.DB_HOST,
  port: environnement.DB_PORT,
  user: environnement.DB_USER,
  password: environnement.DB_PASSWORD,
  database: environnement.DB_NAME,
  waitForConnections: true,
  connectionLimit: environnement.DB_CONNECTION_LIMIT,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  namedPlaceholders: true,
});

export async function verifierConnexionBaseDeDonnees() {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.query('SELECT 1 AS connexion');
  } finally {
    connexion.release();
  }
}

export async function fermerBaseDeDonnees() {
  await baseDeDonnees.end();
}
