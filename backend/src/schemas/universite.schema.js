import { z } from 'zod';

const texteOptionnel = (maximum) => z.string().trim().max(maximum).optional();

export const schemaRechercheUniversites = z.object({
  recherche: texteOptionnel(180),
  ville: texteOptionnel(100),
  province: texteOptionnel(100),
  type: z.enum(['PUBLIQUE', 'PRIVEE']).optional(),
  statut: z.enum(['NON_VERIFIEE', 'EN_ATTENTE', 'VERIFIEE', 'REJETEE']).optional(),
  categorie: z.enum(['UNIVERSITE', 'INSTITUT_SUPERIEUR', 'ECOLE_SECONDAIRE']).optional(),
  campus: texteOptionnel(150),
  filiere: texteOptionnel(180),
  fraisMaximum: z.coerce.number().nonnegative().optional(),
  service: texteOptionnel(140),
  page: z.coerce.number().int().min(1).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(),
});

export const schemaCodeUniversite = z.object({
  code: z.string().trim().min(5).max(30),
});

export const schemaCreationUniversite = z.object({
  nom: z.string().trim().min(3).max(180),
  sigle: texteOptionnel(20),
  slug: z.string().trim().min(3).max(190).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  type: z.enum(['PUBLIQUE', 'PRIVEE']),
  categorie: z.enum(['UNIVERSITE', 'INSTITUT_SUPERIEUR', 'ECOLE_SECONDAIRE']).default('UNIVERSITE'),
  description: texteOptionnel(5000),
  urlLogo: z.string().url().max(500).optional(),
  urlCouverture: z.string().url().max(500).optional(),
  pays: texteOptionnel(100),
  ville: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  adresse: texteOptionnel(255),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  email: z.string().trim().email().max(190).optional(),
  telephone: texteOptionnel(40),
});

export const schemaModificationUniversite = z.object({
  nom: z.string().trim().min(3).max(180).optional(),
  categorie: z.enum(['UNIVERSITE', 'INSTITUT_SUPERIEUR', 'ECOLE_SECONDAIRE']).optional(),
  sigle: z.string().trim().max(20).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  urlLogo: z.string().url().max(500).nullable().optional(),
  urlCouverture: z.string().url().max(500).nullable().optional(),
  siteWeb: z.string().url().max(500).nullable().optional(),
  email: z.string().email().max(190).nullable().optional(),
  telephone: z.string().trim().max(40).nullable().optional(),
  anneeFondation: z.coerce.number().int().min(1000).max(2200).nullable().optional(),
  adresse: z.string().trim().max(255).nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  pays: z.string().trim().min(2).max(100).optional(),
  ville: z.string().trim().min(2).max(100).optional(),
  province: z.string().trim().min(2).max(100).optional(),
  inscriptionsOuvertes: z.boolean().optional(),
  dateDebutInscription: z.string().date().nullable().optional(),
  dateFinInscription: z.string().date().nullable().optional(),
}).refine((o) => Object.keys(o).length > 0);

export const schemaComparaisonUniversites = z.object({
  codes: z.string().trim().min(5).max(500),
});
