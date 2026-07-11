import { z } from 'zod';

export const schemaListePublications = z.object({
  universite: z.string().trim().max(30).optional(),
  auteur: z.string().trim().max(30).optional(),
  type: z.enum(['PROJET', 'ARTICLE', 'RECHERCHE', 'ANNONCE', 'STAGE', 'AUTRE']).optional(),
  etiquette: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});
export const schemaCodePublication = z.object({ code: z.string().trim().min(5).max(30) });

export const schemaCreationPublication = z.object({
  codeUniversite: z.string().trim().min(5).max(30).nullable().optional(),
  titre: z.string().trim().max(220).nullable().optional(),
  contenu: z.string().trim().min(1).max(30000),
  type: z.enum(['PROJET', 'ARTICLE', 'RECHERCHE', 'ANNONCE', 'STAGE', 'AUTRE']),
  etiquettes: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  publier: z.boolean().default(false),
});
export const schemaModificationPublication = z.object({
  titre: z.string().trim().max(220).nullable().optional(),
  contenu: z.string().trim().min(1).max(30000).optional(),
  type: z.enum(['PROJET', 'ARTICLE', 'RECHERCHE', 'ANNONCE', 'STAGE', 'AUTRE']).optional(),
  etiquettes: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  statut: z.enum(['BROUILLON', 'PUBLIEE', 'ARCHIVEE']).optional(),
}).refine((o) => Object.keys(o).length > 0);

export const schemaMedia = z.object({
  type: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT']),
  url: z.string().url().max(500),
  urlMiniature: z.string().url().max(500).nullable().optional(),
  identifiantStockage: z.string().max(255).nullable().optional(),
  typeMime: z.string().max(100).nullable().optional(),
  tailleOctets: z.coerce.number().int().nonnegative().nullable().optional(),
  largeurPixels: z.coerce.number().int().nonnegative().nullable().optional(),
  hauteurPixels: z.coerce.number().int().nonnegative().nullable().optional(),
  dureeSecondes: z.coerce.number().int().nonnegative().nullable().optional(),
  ordre: z.coerce.number().int().nonnegative().default(0),
});
export const schemaCodeMedia = z.object({ codeMedia: z.string().trim().min(5).max(30) });

export const schemaCommentaire = z.object({
  contenu: z.string().trim().min(1).max(5000),
  codeCommentaireParent: z.string().trim().min(5).max(30).nullable().optional(),
});
export const schemaCodeCommentaire = z.object({ codeCommentaire: z.string().trim().min(5).max(30) });
export const schemaModificationCommentaire = z.object({ contenu: z.string().trim().min(1).max(5000) });
