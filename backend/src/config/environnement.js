import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const schemaEnvironnement = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('campushub'),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(50).default(10),
  JWT_SECRET: z.string().min(32).default('developpement-uniquement-changez-moi-123456'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
});

const resultat = schemaEnvironnement.safeParse(process.env);

if (!resultat.success) {
  console.error('Configuration invalide :', resultat.error.flatten().fieldErrors);
  throw new Error('Les variables d’environnement du backend sont invalides.');
}

if (
  resultat.data.NODE_ENV === 'production'
  && resultat.data.JWT_SECRET.startsWith('developpement-uniquement')
) {
  throw new Error('JWT_SECRET doit être remplacé avant le démarrage en production.');
}

export const environnement = Object.freeze(resultat.data);
