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
  typeMedia: z.enum(['IMAGE', 'DOCUMENT']).nullable().optional(),
}).refine((donnees) => Boolean(donnees.contenu || donnees.urlMedia), {
  message: 'Le message doit contenir un texte ou un média.',
});
