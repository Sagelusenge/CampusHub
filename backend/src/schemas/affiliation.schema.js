import { z } from 'zod';

export const schemaCreationAffiliation = z.object({
  codeUniversite: z.string().trim().min(5).max(30),
  codeFiliere: z.string().trim().min(5).max(30),
  matriculeEtudiant: z.string().trim().min(2).max(80),
  message: z.string().trim().max(2000).nullable().optional(),
});
export const schemaCodeAffiliation = z.object({ code: z.string().trim().min(5).max(30) });
export const schemaTraitementAffiliation = z.object({
  statut: z.enum(['ACCEPTEE', 'REJETEE']),
  reponse: z.string().trim().max(2000).nullable().optional(),
});

export const schemaListeEtudiantsUniversite = z.object({
  recherche: z.string().trim().max(120).optional(),
  statut: z.enum(['ACTIF', 'SUSPENDU', 'BLOQUE', 'RETIRE']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export const schemaCodeEtudiantUniversite = z.object({
  code: z.string().trim().min(5).max(30),
});

export const schemaStatutEtudiantUniversite = z.object({
  statut: z.enum(['ACTIF', 'SUSPENDU', 'BLOQUE', 'RETIRE']),
  motif: z.string().trim().max(1000).nullable().optional(),
  dateFinSuspension: z.string().trim().max(40).nullable().optional(),
}).superRefine((donnees, contexte) => {
  if (donnees.statut !== 'ACTIF' && !donnees.motif) {
    contexte.addIssue({ code: 'custom', path: ['motif'], message: 'Le motif est obligatoire pour cette décision.' });
  }
  if (donnees.statut === 'SUSPENDU' && donnees.dateFinSuspension) {
    const date = new Date(donnees.dateFinSuspension);
    if (Number.isNaN(date.getTime()) || date <= new Date()) {
      contexte.addIssue({ code: 'custom', path: ['dateFinSuspension'], message: 'La fin de suspension doit être une date future.' });
    }
  }
});
