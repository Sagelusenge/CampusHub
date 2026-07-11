import { z } from 'zod';

export const schemaSignalement = z.object({
  codePublication: z.string().trim().min(5).max(30),
  motif: z.string().trim().min(3).max(180),
  details: z.string().trim().max(5000).nullable().optional(),
});
export const schemaListeSignalements = z.object({
  statut: z.enum(['OUVERT', 'EN_EXAMEN', 'RESOLU', 'REJETE']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});
export const schemaCodeSignalement = z.object({ code: z.string().trim().min(5).max(30) });
export const schemaTraitementSignalement = z.object({
  statut: z.enum(['EN_EXAMEN', 'RESOLU', 'REJETE']),
  resolution: z.string().trim().max(5000).nullable().optional(),
});
