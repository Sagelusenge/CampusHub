import { z } from 'zod';

export const schemaInscription = z.object({
  email: z.string().trim().email().max(190),
  motDePasse: z.string().min(8).max(72),
  role: z.enum(['VISITEUR', 'ETUDIANT', 'UNIVERSITE', 'ENTREPRISE']),
  nomAffichage: z.string().trim().min(2).max(120),
  pays: z.string().trim().min(2).max(100).optional(),
  ville: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  matriculeEtudiant: z.string().trim().min(2).max(80).optional(),
}).superRefine((donnees, contexte) => {
  if (donnees.role === 'ETUDIANT' && !donnees.matriculeEtudiant) {
    contexte.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['matriculeEtudiant'],
      message: 'Le matricule étudiant est obligatoire.',
    });
  }
});

export const schemaConnexion = z.object({
  email: z.string().trim().email().max(190),
  motDePasse: z.string().min(1).max(72),
});
