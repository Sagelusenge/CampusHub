import { z } from 'zod';

export const schemaInscription = z.object({
  email: z.string().trim().email().max(190),
  motDePasse: z.string().min(8).max(72),
  role: z.enum(['VISITEUR', 'ETUDIANT', 'UNIVERSITE', 'ENTREPRISE']),
  nomAffichage: z.string().trim().min(2).max(120),
  ville: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
});

export const schemaConnexion = z.object({
  email: z.string().trim().email().max(190),
  motDePasse: z.string().min(1).max(72),
});

export const schemaJetonActualisation = z.object({
  jetonActualisation: z.string().min(64).max(200),
});
