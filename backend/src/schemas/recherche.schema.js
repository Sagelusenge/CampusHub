import { z } from 'zod';

export const schemaRecherche = z.object({
  q: z.string().trim().min(2, 'Saisissez au moins deux caractères.').max(200),
});
