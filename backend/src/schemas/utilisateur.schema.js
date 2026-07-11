import { z } from 'zod';

export const schemaListeUtilisateurs = z.object({
  role: z.enum(['VISITEUR', 'ETUDIANT', 'UNIVERSITE', 'ENTREPRISE', 'ADMINISTRATEUR']).optional(),
  statut: z.enum(['EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'SUPPRIME']).optional(),
  recherche: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export const schemaCodeUtilisateur = z.object({
  code: z.string().trim().min(5).max(30),
});

export const schemaModificationUtilisateur = z.object({
  nomAffichage: z.string().trim().min(2).max(120).optional(),
  biographie: z.string().trim().max(3000).nullable().optional(),
  urlPhotoProfil: z.string().url().max(500).nullable().optional(),
  ville: z.string().trim().max(100).nullable().optional(),
  province: z.string().trim().max(100).nullable().optional(),
}).refine((objet) => Object.keys(objet).length > 0, 'Aucune modification fournie.');

export const schemaStatutUtilisateur = z.object({
  statutCompte: z.enum(['EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'SUPPRIME']),
  statutVerification: z.enum(['NON_VERIFIE', 'EN_ATTENTE', 'VERIFIE', 'REJETE']).optional(),
});
