import { z } from 'zod';

export const schemaStory = z.object({
  typeMedia: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
  urlMedia: z.string().url().max(500),
  texte: z.string().trim().max(500).nullable().optional(),
  couleurFond: z.string().trim().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
});

export const schemaCodeStory = z.object({ code: z.string().trim().min(5).max(30) });
