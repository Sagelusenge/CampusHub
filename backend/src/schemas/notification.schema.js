import { z } from 'zod';

export const schemaListeNotifications = z.object({
  nonLues: z.string().transform((v) => v === 'true').optional(),
  page: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});
export const schemaCodeNotification = z.object({ code: z.string().trim().min(5).max(30) });
