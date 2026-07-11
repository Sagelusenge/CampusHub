import { z } from 'zod';

export const schemaCode = z.object({ code: z.string().trim().min(5).max(30) });
export const schemaDeuxCodes = z.object({
  codeCampus: z.string().trim().min(5).max(30),
  codeFiliere: z.string().trim().min(5).max(30),
});

const nullable = (schema) => schema.nullable().optional();

export const schemaCampus = z.object({
  nom: z.string().trim().min(2).max(150),
  adresse: nullable(z.string().trim().max(255)),
  ville: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  latitude: nullable(z.coerce.number().min(-90).max(90)),
  longitude: nullable(z.coerce.number().min(-180).max(180)),
  estPrincipal: z.boolean().default(false),
});
export const schemaCampusModification = schemaCampus.partial().refine((o) => Object.keys(o).length > 0);

export const schemaFaculte = z.object({
  nom: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(190).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: nullable(z.string().trim().max(5000)),
});
export const schemaFaculteModification = schemaFaculte.partial().refine((o) => Object.keys(o).length > 0);

const schemaFiliereBase = z.object({
  nom: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(190).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  domaine: z.string().trim().min(2).max(140),
  niveauDiplome: z.enum(['CERTIFICAT', 'LICENCE', 'MASTER', 'DOCTORAT', 'AUTRE']),
  dureeAnnees: nullable(z.coerce.number().int().min(1).max(15)),
  description: nullable(z.string().trim().max(5000)),
  fraisMinimum: nullable(z.coerce.number().nonnegative()),
  fraisMaximum: nullable(z.coerce.number().nonnegative()),
  devise: z.string().trim().length(3).default('USD'),
  estActive: z.boolean().default(true),
});
export const schemaFiliere = schemaFiliereBase.refine((o) => o.fraisMinimum == null || o.fraisMaximum == null || o.fraisMinimum <= o.fraisMaximum, {
  message: 'Les frais minimum doivent être inférieurs ou égaux aux frais maximum.',
});
export const schemaFiliereModification = schemaFiliereBase.partial().refine((o) => Object.keys(o).length > 0);

export const schemaService = z.object({
  nom: z.string().trim().min(2).max(140),
  description: nullable(z.string().trim().max(5000)),
  estDisponible: z.boolean().default(true),
});
export const schemaServiceModification = schemaService.partial().refine((o) => Object.keys(o).length > 0);

export const schemaInfrastructure = z.object({
  nom: z.string().trim().min(2).max(140),
  categorie: z.string().trim().min(2).max(100),
  description: nullable(z.string().trim().max(5000)),
  quantite: nullable(z.coerce.number().int().nonnegative()),
});
export const schemaInfrastructureModification = schemaInfrastructure.partial().refine((o) => Object.keys(o).length > 0);

export const schemaCondition = z.object({
  titre: z.string().trim().min(2).max(180),
  description: z.string().trim().min(5).max(10000),
  niveauDiplome: nullable(z.enum(['CERTIFICAT', 'LICENCE', 'MASTER', 'DOCTORAT', 'AUTRE'])),
});
export const schemaConditionModification = schemaCondition.partial().refine((o) => Object.keys(o).length > 0);

export const schemaMembre = z.object({
  codeUtilisateur: z.string().trim().min(5).max(30),
  fonction: z.string().trim().max(120).optional(),
  estProprietaire: z.boolean().default(false),
});
