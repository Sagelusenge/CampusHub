import test from 'node:test';
import assert from 'node:assert/strict';

const actif = process.env.RUN_MYSQL_INTEGRATION === '1';

test('parcours métier complet avec MySQL', { skip: !actif }, async (contexte) => {
  const [{ default: request }, { app }, { baseDeDonnees }] = await Promise.all([
    import('supertest'), import('../src/app.js'), import('../src/config/base-de-donnees.js'),
  ]);
  contexte.after(async () => baseDeDonnees.end());

  const appeler = async (methode, chemin, jeton, corps) => {
    let requete = request(app)[methode](chemin);
    if (jeton) requete = requete.set('Authorization', `Bearer ${jeton}`);
    if (corps !== undefined) requete = requete.send(corps);
    const reponse = await requete;
    assert.ok(reponse.status < 400, `${methode.toUpperCase()} ${chemin}: ${JSON.stringify(reponse.body)}`);
    return reponse.body.donnees;
  };

  const inscrire = (email, role) => appeler('post', '/api/v1/auth/inscription', null, {
    email, motDePasse: 'MotDePasseTest123!', role, nomAffichage: email.split('@')[0],
    ville: 'Goma', province: 'Nord-Kivu',
  });
  await inscrire('institution.integration@campushub.test', 'UNIVERSITE');
  await inscrire('etudiant.integration@campushub.test', 'ETUDIANT');
  await inscrire('admin.integration@campushub.test', 'VISITEUR');
  await baseDeDonnees.query(`
    UPDATE utilisateurs SET statut_compte = 'ACTIF', statut_verification = 'VERIFIE'
    WHERE email IN ('institution.integration@campushub.test', 'etudiant.integration@campushub.test')
  `);
  await baseDeDonnees.query(`
    UPDATE utilisateurs SET statut_compte = 'ACTIF', statut_verification = 'VERIFIE', role = 'ADMINISTRATEUR'
    WHERE email = 'admin.integration@campushub.test'
  `);

  const connecter = (email) => appeler('post', '/api/v1/auth/connexion', null, {
    email, motDePasse: 'MotDePasseTest123!',
  });
  const institution = await connecter('institution.integration@campushub.test');
  const etudiant = await connecter('etudiant.integration@campushub.test');
  const admin = await connecter('admin.integration@campushub.test');

  const universite = await appeler('post', '/api/v1/universites', institution.jetonAcces, {
    nom: 'Académie Intégration CampusHub', sigle: 'AIC', slug: 'academie-integration-campushub',
    type: 'PRIVEE', ville: 'Goma', province: 'Nord-Kivu',
  });
  assert.match(universite.code_universite, /^AIC/);
  const monUniversite = await appeler('get', '/api/v1/universites/moi', institution.jetonAcces);
  assert.equal(monUniversite.code_universite, universite.code_universite);

  const campus = await appeler('post', `/api/v1/catalogue/universites/${universite.code_universite}/campus`, institution.jetonAcces, {
    nom: 'Campus central', ville: 'Goma', province: 'Nord-Kivu', estPrincipal: true,
  });
  const faculte = await appeler('post', `/api/v1/catalogue/universites/${universite.code_universite}/facultes`, institution.jetonAcces, {
    nom: 'Sciences informatiques', slug: 'sciences-informatiques',
  });
  const filiere = await appeler('post', `/api/v1/catalogue/facultes/${faculte.code_faculte}/filieres`, institution.jetonAcces, {
    nom: 'Génie logiciel', slug: 'genie-logiciel', domaine: 'Informatique', niveauDiplome: 'LICENCE',
    dureeAnnees: 3, fraisMinimum: 400, fraisMaximum: 650, devise: 'USD', estActive: true,
  });
  await appeler('post', `/api/v1/catalogue/campus/${campus.code_campus}/filieres/${filiere.code_filiere}`, institution.jetonAcces);
  await appeler('post', `/api/v1/catalogue/universites/${universite.code_universite}/services`, institution.jetonAcces, {
    nom: 'Bibliothèque numérique', estDisponible: true,
  });
  await appeler('post', `/api/v1/catalogue/universites/${universite.code_universite}/infrastructures`, institution.jetonAcces, {
    nom: 'Laboratoire informatique', categorie: 'LABORATOIRE', quantite: 2,
  });
  const condition = await appeler('post', `/api/v1/catalogue/universites/${universite.code_universite}/conditions-admission`, institution.jetonAcces, {
    titre: 'Admission en licence', description: 'Présenter les documents scolaires requis.', niveauDiplome: 'LICENCE',
  });
  await appeler('patch', `/api/v1/catalogue/conditions-admission/${condition.code_condition}`, institution.jetonAcces, {
    description: 'Présenter les documents scolaires et une pièce identité.',
  });
  const conditions = await appeler('get', `/api/v1/catalogue/universites/${universite.code_universite}/conditions-admission`);
  assert.equal(conditions.length, 1);

  const profil = await appeler('post', '/api/v1/profils', etudiant.jetonAcces, {
    codeUniversite: universite.code_universite, codeFiliere: filiere.code_filiere,
    matriculeEtudiant: 'INT-001', titreProfil: 'Étudiant développeur', competences: ['Node.js', 'MySQL'],
  });
  assert.equal(profil.code_universite, universite.code_universite);
  const profils = await appeler('get', `/api/v1/profils?universite=${universite.code_universite}`);
  assert.ok(profils.length >= 1);

  const publication = await appeler('post', '/api/v1/publications', etudiant.jetonAcces, {
    codeUniversite: universite.code_universite, titre: 'Projet intégration', contenu: 'Contenu du projet de test.',
    type: 'PROJET', etiquettes: ['node', 'mysql'], publier: true,
  });
  await appeler('post', `/api/v1/publications/${publication.code_publication}/medias`, etudiant.jetonAcces, {
    type: 'IMAGE', url: 'https://example.test/image.jpg', typeMime: 'image/jpeg', tailleOctets: 200000,
  });
  await appeler('post', `/api/v1/publications/${publication.code_publication}/commentaires`, institution.jetonAcces, { contenu: 'Très bon projet.' });
  await appeler('post', `/api/v1/interactions/publications/${publication.code_publication}/jaime`, institution.jetonAcces);
  await appeler('post', `/api/v1/interactions/publications/${publication.code_publication}/favori`, institution.jetonAcces);
  await appeler('post', `/api/v1/interactions/universites/${universite.code_universite}/suivre`, etudiant.jetonAcces);
  await appeler('post', `/api/v1/utilisateurs/${etudiant.utilisateur.code_utilisateur}/suivre`, institution.jetonAcces);
  const favoris = await appeler('get', '/api/v1/interactions/favoris', institution.jetonAcces);
  assert.equal(favoris.length, 1);
  const fichePublication = await appeler('get', `/api/v1/publications/${publication.code_publication}`);
  assert.equal(fichePublication.nombre_jaime, 1);
  const comparaison = await appeler('get', `/api/v1/universites/comparer?codes=ISIG00012026,${universite.code_universite}`);
  assert.equal(comparaison.length, 2);
  const statistiques = await appeler('get', `/api/v1/universites/${universite.code_universite}/statistiques`);
  assert.equal(statistiques.nombre_filieres, 1);

  const signalement = await appeler('post', '/api/v1/moderation/signalements', institution.jetonAcces, {
    codePublication: publication.code_publication, motif: 'Vérification de test', details: 'Signalement d’intégration.',
  });
  await appeler('patch', `/api/v1/moderation/signalements/${signalement.code_signalement}`, admin.jetonAcces, {
    statut: 'RESOLU', resolution: 'Aucune violation constatée.',
  });

  const notifications = await appeler('get', '/api/v1/notifications?nonLues=true', etudiant.jetonAcces);
  assert.ok(notifications.nonLues >= 2);
  const tableau = await appeler('get', '/api/v1/administration/tableau-de-bord', admin.jetonAcces);
  assert.ok(tableau.indicateurs.utilisateurs >= 3);
  await appeler('patch', `/api/v1/administration/universites/${universite.code_universite}/verification`, admin.jetonAcces, { statut: 'VERIFIEE' });
  const audit = await appeler('get', '/api/v1/administration/audit', admin.jetonAcces);
  assert.ok(audit.length >= 2);
  const nouveauJeton = await appeler('post', '/api/v1/auth/actualiser', null, { jetonActualisation: etudiant.jetonActualisation });
  assert.ok(nouveauJeton.jetonAcces);
  const deconnexion = await appeler('post', '/api/v1/auth/deconnexion', null, { jetonActualisation: nouveauJeton.jetonActualisation });
  assert.equal(deconnexion.sessionRevoquee, true);
});
