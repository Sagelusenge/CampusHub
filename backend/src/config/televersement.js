import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const racineBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const dossierTeleversements = path.join(racineBackend, 'uploads');
mkdirSync(path.join(dossierTeleversements, 'images'), { recursive: true });
mkdirSync(path.join(dossierTeleversements, 'medias'), { recursive: true });
mkdirSync(path.join(dossierTeleversements, 'preuves'), { recursive: true });
mkdirSync(path.join(dossierTeleversements, 'documents'), { recursive: true });
mkdirSync(path.join(dossierTeleversements, 'fichiers'), { recursive: true });

function stockage(sousDossier) {
  return multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, path.join(dossierTeleversements, sousDossier)),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const nom = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
      callback(null, nom);
    },
  });
}

const imagesAcceptees = new Set(['image/jpeg', 'image/png', 'image/webp']);
const videosAcceptees = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const fichiersAcceptes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
]);
export const televerserImage = multer({
  storage: stockage('images'), limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, imagesAcceptees.has(file.mimetype)),
});
export const televerserPreuve = multer({
  storage: stockage('preuves'), limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, imagesAcceptees.has(file.mimetype) || file.mimetype === 'application/pdf'),
});
export const televerserDocument = multer({
  storage: stockage('documents'), limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
});
export const televerserMedia = multer({
  storage: stockage('medias'), limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, imagesAcceptees.has(file.mimetype) || videosAcceptees.has(file.mimetype)),
});
export const televerserFichier = multer({
  storage: stockage('fichiers'), limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, fichiersAcceptes.has(file.mimetype)),
});
