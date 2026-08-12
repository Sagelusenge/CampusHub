import test from 'node:test';
import assert from 'node:assert/strict';

const actif = process.env.RUN_MYSQL_INTEGRATION === '1';

test('parcours CampusHubIA complet avec MySQL', { skip: !actif, timeout: 60000 }, async (contexte) => {
  const [{ default: request }, { app }, { baseDeDonnees }] = await Promise.all([
    import('supertest'), import('../src/app.js'), import('../src/config/base-de-donnees.js'),
  ]);
  const emails = [
    'institution.ai.integration@campushub.test',
    'etudiant.ai.integration@campushub.test',
    'admin.ai.integration@campushub.test',
  ];
  const nettoyer = async () => {
    await baseDeDonnees.query('DELETE FROM utilisateurs WHERE email IN (?, ?, ?)', emails);
    await baseDeDonnees.query("DELETE FROM universites WHERE slug = 'academie-ai-integration-campushub'");
  };
  await nettoyer();
  contexte.after(async () => { await nettoyer(); await baseDeDonnees.end(); });

  const appeler = async (methode, chemin, jeton, corps) => {
    let requete = request(app)[methode](chemin).timeout({ response: 5000, deadline: 10000 });
    if (jeton) requete = requete.set('Authorization', `Bearer ${jeton}`);
    if (corps !== undefined) requete = requete.send(corps);
    const reponse = await requete;
    assert.ok(reponse.status < 400, `${methode.toUpperCase()} ${chemin}: ${JSON.stringify(reponse.body)}`);
    return reponse.body.donnees;
  };

  const inscrire = (email, role) => appeler('post', '/api/v1/auth/inscription', null, {
    email, motDePasse: 'MotDePasseTest123!', role, nomAffichage: email.split('@')[0],
    ville: 'Goma', province: 'Nord-Kivu',
    ...(role === 'ETUDIANT' ? { matriculeEtudiant: 'AI-INT-001' } : {}),
  });
  await inscrire(emails[0], 'UNIVERSITE');
  await inscrire(emails[1], 'ETUDIANT');
  await inscrire(emails[2], 'VISITEUR');
  await baseDeDonnees.query(
    "UPDATE utilisateurs SET statut_compte = 'ACTIF', statut_verification = 'VERIFIE' WHERE email IN (?, ?)",
    [emails[0], emails[1]],
  );
  await baseDeDonnees.query(
    "UPDATE utilisateurs SET statut_compte = 'ACTIF', statut_verification = 'VERIFIE', role = 'ADMINISTRATEUR' WHERE email = ?",
    [emails[2]],
  );

  const connecter = (email) => appeler('post', '/api/v1/auth/connexion', null, {
    email, motDePasse: 'MotDePasseTest123!',
  });
  const institution = await connecter(emails[0]);
  const etudiant = await connecter(emails[1]);
  const admin = await connecter(emails[2]);

  const navigateurEtudiant = request.agent(app);
  const connexionCookie = await navigateurEtudiant.post('/api/v1/auth/connexion').send({
    email: emails[1], motDePasse: 'MotDePasseTest123!',
  });
  assert.equal(connexionCookie.status, 200);
  assert.equal(connexionCookie.body.donnees.jetonActualisation, undefined);
  assert.match(connexionCookie.headers['set-cookie']?.[0] || '', /campushub_refresh=.*HttpOnly.*SameSite=Lax/i);
  const actualisationCookie = await navigateurEtudiant.post('/api/v1/auth/actualiser');
  assert.equal(actualisationCookie.status, 200);
  assert.ok(actualisationCookie.body.donnees.jetonAcces);
  assert.equal(actualisationCookie.body.donnees.jetonActualisation, undefined);
  const deconnexionCookie = await navigateurEtudiant.post('/api/v1/auth/deconnexion');
  assert.equal(deconnexionCookie.status, 200);
  assert.match(deconnexionCookie.headers['set-cookie']?.[0] || '', /campushub_refresh=;/i);
  const sessionFermee = await navigateurEtudiant.post('/api/v1/auth/actualiser');
  assert.equal(sessionFermee.status, 401);

  const plans = await appeler('get', '/api/v1/abonnements/plans');
  const paiement = await appeler('post', '/api/v1/abonnements/paiements', null, {
    codeUtilisateur: institution.utilisateur.code_utilisateur,
    codePlan: plans[0].code_plan,
    typePaiement: 'ABONNEMENT',
    moyenPaiement: 'MOBILE_MONEY',
    referencePaiement: 'AI-INT-PAY-001',
  });
  await appeler('patch', `/api/v1/abonnements/paiements/${paiement.code_paiement}`, admin.jetonAcces, {
    statut: 'VALIDE', commentaire: 'Paiement de test validé.',
  });

  const universite = await appeler('post', '/api/v1/universites', institution.jetonAcces, {
    nom: 'Académie AI Intégration CampusHub', sigle: 'AAIC', slug: 'academie-ai-integration-campushub',
    type: 'PRIVEE', ville: 'Goma', province: 'Nord-Kivu',
  });
  await appeler('patch', `/api/v1/administration/universites/${universite.code_universite}/verification`, admin.jetonAcces, { statut: 'VERIFIEE' });
  const faculte = await appeler('post', `/api/v1/catalogue/universites/${universite.code_universite}/facultes`, institution.jetonAcces, {
    nom: 'Sciences informatiques', slug: 'sciences-informatiques',
  });
  const filiere = await appeler('post', `/api/v1/catalogue/facultes/${faculte.code_faculte}/filieres`, institution.jetonAcces, {
    nom: 'Génie logiciel', slug: 'genie-logiciel', domaine: 'Informatique', niveauDiplome: 'LICENCE',
    dureeAnnees: 3, fraisMinimum: 400, fraisMaximum: 650, devise: 'USD', estActive: true,
  });

  const contexteCopilote = await appeler('get', '/api/v1/copilote-institution/contexte', institution.jetonAcces);
  assert.equal(contexteCopilote.universite.code_universite, universite.code_universite);
  const brouillon = await appeler('post', '/api/v1/copilote-institution/generer', institution.jetonAcces, {
    type: 'PRESENTATION_FILIERE',
    demande: 'Préparez une présentation claire de cette filière pour de futurs étudiants.',
    ton: 'ACCUEILLANT', publicCible: 'futurs étudiants', codeFiliere: filiere.code_filiere,
  });
  assert.match(brouillon.code_generation, /^COP/);
  assert.match(brouillon.resultat, /Génie logiciel/i);
  const orientationInterdite = await request(app)
    .get('/api/v1/orientation/configuration')
    .set('Authorization', `Bearer ${institution.jetonAcces}`)
    .expect(403);
  assert.equal(orientationInterdite.body.succes, false);

  const affiliation = await appeler('post', '/api/v1/affiliations', etudiant.jetonAcces, {
    codeUniversite: universite.code_universite, codeFiliere: filiere.code_filiere,
    matriculeEtudiant: 'AI-INT-001', message: 'Demande de test du parcours CampusHubIA.',
  });
  await appeler('patch', `/api/v1/affiliations/${affiliation.code_demande}`, institution.jetonAcces, {
    statut: 'ACCEPTEE', reponse: 'Affiliation de test confirmée.',
  });

  const orientation = await appeler('post', '/api/v1/orientation/recommandations', etudiant.jetonAcces, {
    objectif: 'Je veux devenir développeur de logiciels utiles à ma communauté.',
    message: 'Je cherche une formation pratique, abordable et vérifiée.',
    criteres: {
      domaines: ['Informatique'], budgetMax: 800, devise: 'USD',
      pays: 'République démocratique du Congo', province: 'Nord-Kivu', ville: 'Goma',
      niveau: 'LICENCE', mobilite: false, langues: ['français'],
    },
  });
  assert.match(orientation.codeDossier, /^ORI/);
  assert.ok(orientation.recommandations.length >= 1);
  assert.ok(orientation.recommandations.every((item) => item.frais_minimum === null || item.frais_minimum <= 800));

  const historique = await appeler('get', '/api/v1/orientation/dossiers', etudiant.jetonAcces);
  assert.ok(historique.some((item) => item.code_dossier === orientation.codeDossier));
});
