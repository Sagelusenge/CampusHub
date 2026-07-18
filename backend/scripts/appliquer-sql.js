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
    charset: 'utf8mb4',
  });
  try {
    let delimiteur = ';';
    let tampon = '';
    const instructions = [];
    for (const ligne of sql.split(/\r?\n/)) {
      const directive = ligne.trim().match(/^DELIMITER\s+(.+)$/i);
      if (directive) {
        delimiteur = directive[1];
        continue;
      }
      tampon += `${ligne}\n`;
      if (ligne.trimEnd().endsWith(delimiteur)) {
        const fin = tampon.lastIndexOf(delimiteur);
        const instruction = tampon.slice(0, fin).trim();
        if (instruction) instructions.push(instruction);
        tampon = '';
      }
    }
    if (tampon.trim()) instructions.push(tampon.trim());
    for (const instruction of instructions) await connexion.query(instruction);
    console.log(`Script appliqué : ${path.basename(chemin)}`);
  } finally {
    await connexion.end();
  }
}
