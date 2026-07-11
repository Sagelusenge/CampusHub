import { z } from 'zod';

const texteOptionnel = (maximum) => z.string().trim().max(maximum).optional();

export const schemaRechercheUniversites = z.object({
  ville: texteOptionnel(100),
  province: texteOptionnel(100),
  type: z.enum(['PUBLIQUE', 'PRIVEE']).optional(),
  filiere: texteOptionnel(180),
  fraisMaximum: z.coerce.number().nonnegative().optional(),
  service: texteOptionnel(140),
});

export const schemaCodeUniversite = z.object({
  code: z.string().trim().min(5).max(30),
});

export const schemaCreationUniversite = z.object({
  nom: z.string().trim().min(3).max(180),
  sigle: texteOptionnel(20),
  slug: z.string().trim().min(3).max(190).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: z.enum(['PUBLIQUE', 'PRIVEE']),
  description: texteOptionnel(5000),
  ville: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(190).optional(),
  telephone: texteOptionnel(40),
});
