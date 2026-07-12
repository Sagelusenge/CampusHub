import { z } from 'zod';

export const schemaListeProfils = z.object({
  universite: z.string().trim().max(30).optional(),
  filiere: z.string().trim().max(30).optional(),
  competence: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});

export const schemaCodeProfil = z.object({ code: z.string().trim().min(5).max(30) });

export const schemaCreationProfil = z.object({
  codeUniversite: z.string().trim().min(5).max(30),
  codeFiliere: z.string().trim().min(5).max(30),
  matriculeEtudiant: z.string().trim().min(2).max(80),
  titreProfil: z.string().trim().max(180).optional(),
  competences: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  anneeDiplomation: z.coerce.number().int().min(1950).max(2200).optional(),
});

export const schemaModificationProfil = z.object({
  matriculeEtudiant: z.string().trim().max(80).nullable().optional(),
  titreProfil: z.string().trim().max(180).nullable().optional(),
  competences: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  anneeDiplomation: z.coerce.number().int().min(1950).max(2200).nullable().optional(),
  estVisible: z.boolean().optional(),
}).refine((objet) => Object.keys(objet).length > 0, 'Aucune modification fournie.');
