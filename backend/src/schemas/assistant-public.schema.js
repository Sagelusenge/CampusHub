import { z } from 'zod';

const messageHistorique = z.object({
  role: z.enum(['UTILISATEUR', 'ASSISTANT']),
  contenu: z.string().trim().min(1).max(2000),
});

export const schemaQuestionAssistantPublic = z.object({
  question: z.string().trim().min(2).max(1200),
  historique: z.array(messageHistorique).max(8).default([]),
});
