import { z } from 'zod';

export const schemaSuggestionLocalisation = z.object({
  pays: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  villeProposee: z.string().trim().min(2).max(100),
  emailContact: z.string().trim().email().max(190).nullable().optional(),
});
export const schemaCodeSuggestion = z.object({ code: z.string().trim().min(5).max(30) });
export const schemaTraitementSuggestion = z.object({ statut: z.enum(['ACCEPTEE', 'REJETEE']) });
