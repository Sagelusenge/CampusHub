import { z } from 'zod';

const code = z.string().trim().min(5).max(30);

export const schemaCodeUtilisateur = z.object({ codeUtilisateur: code });
export const schemaCodeRelation = z.object({ code: code });
export const schemaRechercheRelations = z.object({
  recherche: z.string().trim().max(100).optional().default(''),
});
export const schemaInvitationRelation = z.object({
  codeDestinataire: code,
  message: z.string().trim().max(500).nullable().optional(),
});
export const schemaReponseRelation = z.object({
  statut: z.enum(['ACCEPTEE', 'REFUSEE']),
});

const champFormulaire = z.object({
  id: z.string().trim().min(1).max(60).regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().trim().min(2).max(120),
  type: z.enum(['TEXTE', 'EMAIL', 'TELEPHONE', 'DATE', 'NOMBRE', 'ZONE_TEXTE', 'SELECT']),
  obligatoire: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(100)).max(30).optional().default([]),
});

export const schemaFormulaireInscription = z.object({
  titre: z.string().trim().min(5).max(220),
  description: z.string().trim().max(5000).nullable().optional(),
  instructions: z.string().trim().max(5000).nullable().optional(),
  champs: z.array(champFormulaire).min(1).max(25),
  dateFermeture: z.string().date().nullable().optional(),
  estActif: z.boolean().default(false),
});
export const schemaCodeUniversiteCommunaute = z.object({ codeUniversite: code });
export const schemaDemandeInscription = z.object({
  reponses: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).refine(
    (value) => Object.keys(value).length > 0 && Object.keys(value).length <= 25,
    'Les réponses au formulaire sont requises.',
  ),
});
export const schemaTraitementInscription = z.object({
  statut: z.enum(['EN_ETUDE', 'DOCUMENTS_REQUIS', 'ACCEPTEE', 'REFUSEE']),
  noteEtablissement: z.string().trim().max(5000).nullable().optional(),
});
export const schemaCodeDemandeInscription = z.object({ code: code });

export const schemaPartenaire = z.object({
  nom: z.string().trim().min(2).max(180),
  categorie: z.enum(['ACADEMIQUE', 'ENTREPRISE', 'ONG', 'INSTITUTION', 'TECHNOLOGIQUE', 'AUTRE']).default('AUTRE'),
  description: z.string().trim().max(1000).nullable().optional(),
  siteWeb: z.string().url().max(500).nullable().optional().or(z.literal('')),
  urlLogo: z.string().url().max(500).nullable().optional().or(z.literal('')),
  estActif: z.boolean().default(true),
});
export const schemaCodePartenaire = z.object({ code: code });
