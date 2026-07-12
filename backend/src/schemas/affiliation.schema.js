import { z } from 'zod';

export const schemaCreationAffiliation = z.object({
  codeUniversite: z.string().trim().min(5).max(30),
  codeFiliere: z.string().trim().min(5).max(30),
  matriculeEtudiant: z.string().trim().max(80).nullable().optional(),
  message: z.string().trim().max(2000).nullable().optional(),
});
export const schemaCodeAffiliation = z.object({ code: z.string().trim().min(5).max(30) });
export const schemaTraitementAffiliation = z.object({
  statut: z.enum(['ACCEPTEE', 'REJETEE']),
  reponse: z.string().trim().max(2000).nullable().optional(),
});
