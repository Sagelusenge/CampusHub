import { z } from 'zod';

export const schemaGenerationCopilote = z.object({
  type: z.enum(['PUBLICATION', 'PRESENTATION_FILIERE', 'ADMISSION', 'DIAGNOSTIC_FICHE']),
  demande: z.string().trim().min(10).max(2500),
  ton: z.enum(['PROFESSIONNEL', 'ACCUEILLANT', 'DYNAMIQUE', 'INSTITUTIONNEL']).default('PROFESSIONNEL'),
  publicCible: z.string().trim().min(2).max(120).default('futurs étudiants'),
  codeFiliere: z.string().trim().min(5).max(30).nullable().optional(),
});
