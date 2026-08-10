import { baseDeDonnees } from '../src/config/base-de-donnees.js';

const [resultat] = await baseDeDonnees.execute(`
  UPDATE universites
  SET url_couverture = CASE
    WHEN categorie_etablissement = 'ECOLE_SECONDAIRE' THEN '/images/campus-jardin.webp'
    WHEN categorie_etablissement = 'INSTITUT_SUPERIEUR' THEN '/images/campus-technologie.webp'
    ELSE '/images/campus-goma.webp'
  END
  WHERE url_couverture IS NULL OR TRIM(url_couverture) = ''
`);

console.log(JSON.stringify({ couverturesAjoutees: resultat.affectedRows }));
await baseDeDonnees.end();
