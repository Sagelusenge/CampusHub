import { z } from 'zod';

export const schemaListeUtilisateurs = z.object({
  role: z.enum(['VISITEUR', 'ETUDIANT', 'UNIVERSITE', 'ENTREPRISE', 'ADMINISTRATEUR']).optional(),
  statut: z.enum(['EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'BLOQUE', 'SUPPRIME']).optional(),
  verification: z.enum(['NON_VERIFIE', 'EN_ATTENTE', 'VERIFIE', 'REJETE']).optional(),
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
  statutCompte: z.enum(['EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'BLOQUE', 'SUPPRIME']),
  statutVerification: z.enum(['NON_VERIFIE', 'EN_ATTENTE', 'VERIFIE', 'REJETE']).optional(),
});

const roleAdministrable = z.enum(['VISITEUR', 'ETUDIANT', 'ENTREPRISE', 'ADMINISTRATEUR']);

export const schemaCreationUtilisateurAdmin = z.object({
  email: z.string().trim().email().max(190),
  motDePasse: z.string().min(8).max(72),
  role: roleAdministrable,
  nomAffichage: z.string().trim().min(2).max(120),
  pays: z.string().trim().max(100).nullable().optional(),
  province: z.string().trim().max(100).nullable().optional(),
  ville: z.string().trim().max(100).nullable().optional(),
  matriculeEtudiant: z.string().trim().min(2).max(80).optional(),
}).superRefine((donnees, contexte) => {
  if (donnees.role === 'ETUDIANT' && !donnees.matriculeEtudiant) {
    contexte.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['matriculeEtudiant'],
      message: 'Le matricule est obligatoire pour un compte étudiant.',
    });
  }
});

export const schemaModificationUtilisateurAdmin = z.object({
  email: z.string().trim().email().max(190).optional(),
  motDePasse: z.string().min(8).max(72).optional(),
  role: roleAdministrable.optional(),
  nomAffichage: z.string().trim().min(2).max(120).optional(),
  pays: z.string().trim().max(100).nullable().optional(),
  province: z.string().trim().max(100).nullable().optional(),
  ville: z.string().trim().max(100).nullable().optional(),
  matriculeEtudiant: z.string().trim().min(2).max(80).nullable().optional(),
}).refine((objet) => Object.keys(objet).length > 0, 'Aucune modification fournie.');
