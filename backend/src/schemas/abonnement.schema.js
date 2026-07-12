import { z } from 'zod';

export const schemaPaiementAbonnement = z.object({
  codeUtilisateur: z.string().trim().min(5).max(30),
  moyenPaiement: z.enum(['MOBILE_MONEY', 'CARTE', 'VIREMENT', 'ESPECES', 'AUTRE']),
  referencePaiement: z.string().trim().min(3).max(120),
  urlPreuve: z.string().url().max(500).nullable().optional(),
});

export const schemaCodePaiement = z.object({ code: z.string().trim().min(5).max(30) });
export const schemaTraitementPaiement = z.object({
  statut: z.enum(['VALIDE', 'REJETE']),
  commentaire: z.string().trim().max(1000).nullable().optional(),
});

export const schemaListePaiements = z.object({
  statut: z.enum(['EN_ATTENTE', 'VALIDE', 'REJETE']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(50),
});
