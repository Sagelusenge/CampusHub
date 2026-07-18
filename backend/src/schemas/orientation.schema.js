import { z } from 'zod';

const criteresOrientation = z.object({
  domaines: z.array(z.string().trim().min(2).max(120)).max(6).default([]),
  budgetMax: z.coerce.number().positive().max(1000000).nullable().optional(),
  devise: z.string().trim().length(3).default('USD'),
  pays: z.string().trim().max(100).default('République démocratique du Congo'),
  province: z.string().trim().max(100).nullable().optional(),
  ville: z.string().trim().max(100).nullable().optional(),
  niveau: z.enum(['CERTIFICAT', 'LICENCE', 'MASTER', 'DOCTORAT', 'AUTRE']).nullable().optional(),
  mobilite: z.boolean().default(true),
  langues: z.array(z.string().trim().min(2).max(40)).max(5).default(['français']),
});

export const schemaOrientation = z.object({
  objectif: z.string().trim().min(10).max(500),
  message: z.string().trim().max(2000).nullable().optional(),
  criteres: criteresOrientation,
  bulletinUrl: z.string().url().max(500).nullable().optional(),
  analyseBulletin: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const schemaAnalyseBulletin = z.object({
  urlImage: z.string().url().max(500),
});

export const schemaCodeDossier = z.object({ code: z.string().trim().min(5).max(30) });
