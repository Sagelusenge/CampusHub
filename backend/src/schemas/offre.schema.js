import { z } from 'zod';

const types = ['INSCRIPTION', 'BOURSE', 'FORMATION', 'STAGE', 'EMPLOI', 'EVENEMENT', 'AUTRE'];
const publics = ['TOUS', 'ETUDIANTS', 'ELEVES', 'DIPLOMES', 'PARENTS'];
const modalites = ['PRESENTIEL', 'EN_LIGNE', 'HYBRIDE'];
const statuts = ['BROUILLON', 'PUBLIEE', 'CLOTUREE', 'RETIREE'];
const dateOptionnelle = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit être au format AAAA-MM-JJ.').nullable().optional();
const urlOptionnelle = z.union([z.string().url().max(500), z.literal('')]).nullable().optional();
const emailOptionnel = z.union([z.string().email().max(190), z.literal('')]).nullable().optional();

export const schemaListeOffres = z.object({
  recherche: z.string().trim().max(120).optional(),
  type: z.enum(types).optional(),
  publicCible: z.enum(publics).optional(),
  categorie: z.enum(['UNIVERSITE', 'INSTITUT_SUPERIEUR', 'ECOLE_SECONDAIRE']).optional(),
  province: z.string().trim().max(100).optional(),
  ville: z.string().trim().max(100).optional(),
  universite: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(50).default(12),
});

export const schemaListeMesOffres = schemaListeOffres.extend({
  statut: z.enum(statuts).optional(),
});

export const schemaCodeOffre = z.object({ code: z.string().trim().min(5).max(30) });

export const schemaCreationOffre = z.object({
  codeUniversite: z.string().trim().min(5).max(30),
  titre: z.string().trim().min(5).max(220),
  type: z.enum(types),
  publicCible: z.enum(publics).default('TOUS'),
  description: z.string().trim().min(20).max(30000),
  conditions: z.string().trim().max(15000).nullable().optional(),
  modalite: z.enum(modalites).default('PRESENTIEL'),
  ville: z.string().trim().max(100).nullable().optional(),
  province: z.string().trim().max(100).nullable().optional(),
  urlCandidature: urlOptionnelle,
  emailContact: emailOptionnel,
  urlImage: urlOptionnelle,
  urlDocument: urlOptionnelle,
  nomDocument: z.string().trim().max(255).nullable().optional(),
  dateDebut: dateOptionnelle,
  dateLimite: dateOptionnelle,
  publier: z.boolean().default(false),
}).refine((o) => !o.dateDebut || !o.dateLimite || o.dateLimite >= o.dateDebut, {
  message: 'La date limite doit être postérieure à la date de début.', path: ['dateLimite'],
});

export const schemaModificationOffre = z.object({
  titre: z.string().trim().min(5).max(220).optional(),
  type: z.enum(types).optional(),
  publicCible: z.enum(publics).optional(),
  description: z.string().trim().min(20).max(30000).optional(),
  conditions: z.string().trim().max(15000).nullable().optional(),
  modalite: z.enum(modalites).optional(),
  ville: z.string().trim().max(100).nullable().optional(),
  province: z.string().trim().max(100).nullable().optional(),
  urlCandidature: urlOptionnelle,
  emailContact: emailOptionnel,
  urlImage: urlOptionnelle,
  urlDocument: urlOptionnelle,
  nomDocument: z.string().trim().max(255).nullable().optional(),
  dateDebut: dateOptionnelle,
  dateLimite: dateOptionnelle,
  statut: z.enum(statuts).optional(),
}).refine((o) => Object.keys(o).length > 0, 'Aucune donnée à modifier.')
  .refine((o) => !o.dateDebut || !o.dateLimite || o.dateLimite >= o.dateDebut, {
    message: 'La date limite doit être postérieure à la date de début.', path: ['dateLimite'],
  });
