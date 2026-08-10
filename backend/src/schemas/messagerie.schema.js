import { z } from 'zod';

export const schemaContacts = z.object({
  recherche: z.string().trim().max(120).default(''),
});

export const schemaNouvelleConversation = z.object({
  codeDestinataire: z.string().trim().min(5).max(30),
});

export const schemaCodeConversation = z.object({
  code: z.string().trim().min(5).max(30),
});

export const schemaMessage = z.object({
  contenu: z.string().trim().max(5000).nullable().optional(),
  urlMedia: z.string().url().max(500).nullable().optional(),
  typeMedia: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'FICHIER']).nullable().optional(),
  nomMedia: z.string().trim().max(255).nullable().optional(),
  typeMime: z.string().trim().max(120).nullable().optional(),
  tailleOctets: z.coerce.number().int().nonnegative().max(60 * 1024 * 1024).nullable().optional(),
  dureeEphemere: z.enum(['1_HEURE', '24_HEURES', '7_JOURS']).nullable().optional(),
}).refine((donnees) => Boolean(donnees.contenu || donnees.urlMedia), {
  message: 'Le message doit contenir un texte ou un média.',
});

export const schemaEtatSaisie = z.object({
  actif: z.boolean(),
});

export const schemaCodeContact = z.object({
  code: z.string().trim().min(5).max(30),
});

export const schemaBlocage = z.object({
  bloque: z.boolean(),
});
