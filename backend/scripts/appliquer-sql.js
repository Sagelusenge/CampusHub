import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { environnement } from '../src/config/environnement.js';

const fichier = process.argv[2];
if (!fichier) {
  console.error('Usage : node scripts/appliquer-sql.js <chemin-du-fichier.sql>');
  process.exitCode = 1;
} else {
  const chemin = path.resolve(process.cwd(), fichier);
  const sql = await fs.readFile(chemin, 'utf8');
  const connexion = await mysql.createConnection({
    host: environnement.DB_HOST,
    port: environnement.DB_PORT,
    user: environnement.DB_USER,
    password: environnement.DB_PASSWORD,
    database: environnement.DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  try {
    await connexion.query(sql);
    console.log(`Script appliqué : ${path.basename(chemin)}`);
  } finally {
    await connexion.end();
  }
}
