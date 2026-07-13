import { z } from 'zod';

export const schemaContact = z.object({
  nom: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  sujet: z.string().trim().min(3).max(180),
  message: z.string().trim().min(10).max(10000),
});
export const schemaFiltreContact = z.object({ statut: z.enum(['NOUVEAU', 'EN_COURS', 'TRAITE', 'ARCHIVE']).optional() });
export const schemaCodeContact = z.object({ code: z.string().trim().min(5).max(30) });
export const schemaTraitementContact = z.object({
  statut: z.enum(['EN_COURS', 'TRAITE', 'ARCHIVE']),
  reponse: z.string().trim().max(10000).nullable().optional(),
});
