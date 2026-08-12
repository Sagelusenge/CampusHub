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
  SMTP_HOST: z.string().min(1).default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z.string().default('true').transform((valeur) => valeur === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default(''),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().or(z.literal('')).default(''),
  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(10),
  EMAIL_VERIFICATION_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  CAMPUSHUB_IA_URL: z.string().url().default('http://127.0.0.1:5000'),
  CAMPUSHUB_IA_TOKEN: z.string().default(''),
  CAMPUSHUB_IA_MODEL: z.string().min(1).default('campushub-ia-local-v1'),
  CAMPUSHUB_IA_TIMEOUT_MS: z.coerce.number().int().min(500).max(30000).default(8000),
  CAMPUSHUB_WEB_ENABLED: z.string().default('true').transform((valeur) => valeur !== 'false'),
  CAMPUSHUB_WEB_TIMEOUT_MS: z.coerce.number().int().min(500).max(10000).default(3500),
  CAMPUSHUB_WEB_MAX_SOURCES: z.coerce.number().int().min(1).max(3).default(2),
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
