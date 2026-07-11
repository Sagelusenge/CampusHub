import { z } from 'zod';

export const schemaAudit = z.object({
  typeEntite: z.string().trim().max(80).optional(),
  action: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(30),
});
export const schemaVerificationUniversite = z.object({
  statut: z.enum(['NON_VERIFIEE', 'EN_ATTENTE', 'VERIFIEE', 'REJETEE']),
});
export const schemaCodeUniversiteAdmin = z.object({ code: z.string().trim().min(5).max(30) });
