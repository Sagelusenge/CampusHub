import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function trouverFichiersJavaScript(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const fichiers = [];
  for (const entree of entrees) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) fichiers.push(...await trouverFichiersJavaScript(chemin));
    if (entree.isFile() && entree.name.endsWith('.js')) fichiers.push(chemin);
  }
  return fichiers;
}

const dossierSource = fileURLToPath(new URL('../src', import.meta.url));
const fichiers = await trouverFichiersJavaScript(dossierSource);
for (const fichier of fichiers) {
  const resultat = spawnSync(process.execPath, ['--check', fichier], { stdio: 'inherit' });
  if (resultat.status !== 0) process.exit(resultat.status ?? 1);
}
console.log(`Syntaxe valide pour ${fichiers.length} fichiers JavaScript.`);
