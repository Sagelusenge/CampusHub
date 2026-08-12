import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { baseDeDonnees } from '../src/config/base-de-donnees.js';
import { rechercherFormations } from '../src/services/orientation.service.js';

const cheminCas = new URL('../evals/orientation-cases.json', import.meta.url);
const cas = JSON.parse(await fs.readFile(cheminCas, 'utf8'));
const resultats = [];

try {
  for (const scenario of cas) {
    const formations = await rechercherFormations(scenario.filtres);
    if (scenario.minimum !== undefined) {
      assert.ok(formations.length >= scenario.minimum, `${scenario.nom}: ${formations.length} résultat(s), minimum ${scenario.minimum}`);
    }
    if (scenario.maximum !== undefined) {
      assert.ok(formations.length <= scenario.maximum, `${scenario.nom}: ${formations.length} résultat(s), maximum ${scenario.maximum}`);
    }
    if (scenario.filtres.budget_max) {
      assert.ok(formations.every((item) => item.frais_minimum === null || item.frais_minimum <= scenario.filtres.budget_max), `${scenario.nom}: budget non respecté`);
    }
    if (scenario.villeAttendue) {
      assert.ok(formations.every((item) => item.ville === scenario.villeAttendue || String(item.campus || '').includes(scenario.villeAttendue)), `${scenario.nom}: ville non respectée`);
    }
    if (scenario.termesAttendus && formations.length) {
      const texte = formations.map((item) => `${item.nom_filiere} ${item.domaine} ${item.nom_faculte}`).join(' ').toLocaleLowerCase('fr');
      assert.ok(scenario.termesAttendus.some((terme) => texte.includes(terme.toLocaleLowerCase('fr'))), `${scenario.nom}: domaine inattendu`);
    }

    const codes = formations.map((item) => item.code_universite);
    if (codes.length) {
      const parametres = codes.map(() => '?').join(',');
      const [institutions] = await baseDeDonnees.query(
        `SELECT code_universite, statut_verification FROM universites WHERE code_universite IN (${parametres})`,
        codes,
      );
      assert.ok(institutions.every((item) => item.statut_verification === 'VERIFIEE'), `${scenario.nom}: institution non vérifiée retournée`);
    }
    resultats.push({ scenario: scenario.nom, statut: 'RÉUSSI', formations: formations.length });
  }

  console.table(resultats);
  console.log(`Évaluation CampusHubIA réussie : ${resultats.length}/${cas.length} scénarios.`);
} finally {
  await baseDeDonnees.end();
}
