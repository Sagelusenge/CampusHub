import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { metaPagination, pagination } from '../utils/sql.js';
import { envoyerActivationEssai, envoyerDecisionPaiement } from './email.service.js';

export async function activerEssaiGratuit(utilisateurId, connexion = baseDeDonnees) {
  const [comptes] = await connexion.execute(
    `SELECT id, email, nom_affichage, role, essai_gratuit_utilise
     FROM utilisateurs WHERE id = ? FOR UPDATE`,
    [utilisateurId],
  );
  const compte = comptes[0];
  if (!compte || compte.role !== 'UNIVERSITE') return { cree: false, abonnement: null };

  if (compte.essai_gratuit_utilise) {
    const [existants] = await connexion.execute(
      `SELECT a.*, p.code_plan, p.nom AS nom_plan, p.prix_total,
         GREATEST(DATEDIFF(a.date_fin, CURRENT_TIMESTAMP), 0) AS jours_restants
       FROM abonnements_universite a
       JOIN plans_abonnement p ON p.id = a.plan_id
       WHERE a.utilisateur_id = ? AND a.type_abonnement = 'ESSAI'
       ORDER BY a.date_fin DESC LIMIT 1`,
      [utilisateurId],
    );
    return { cree: false, abonnement: existants[0] ?? null, compte };
  }

  const [plans] = await connexion.execute(
    'SELECT id FROM plans_abonnement WHERE est_actif = 1 ORDER BY id LIMIT 1',
  );
  if (!plans[0]) throw new ErreurApi(503, 'La formule CampusHub est momentanément indisponible.');

  const debut = new Date();
  const fin = new Date(debut.getTime() + 30 * 86_400_000);
  await connexion.execute(
    `INSERT INTO abonnements_universite
      (id, code_abonnement, utilisateur_id, universite_id, plan_id, paiement_id,
       type_abonnement, date_debut, date_fin, certification_incluse)
     VALUES (0, '', ?, NULL, ?, NULL, 'ESSAI', ?, ?, 0)`,
    [utilisateurId, plans[0].id, debut, fin],
  );
  await connexion.execute(
    `UPDATE utilisateurs
     SET essai_gratuit_utilise = 1, statut_compte = 'ACTIF'
     WHERE id = ?`,
    [utilisateurId],
  );
  await connexion.execute(
    `INSERT INTO notifications
      (id, code_notification, destinataire_id, type_notification, titre, message)
     VALUES (0, '', ?, 'ABONNEMENT', 'Votre essai gratuit est actif',
       'Vous disposez de 30 jours gratuits pour découvrir toutes les fonctionnalités institutionnelles de CampusHub.')`,
    [utilisateurId],
  );

  const [abonnements] = await connexion.execute(
    `SELECT a.*, p.code_plan, p.nom AS nom_plan, p.prix_total,
       GREATEST(DATEDIFF(a.date_fin, CURRENT_TIMESTAMP), 0) AS jours_restants
     FROM abonnements_universite a
     JOIN plans_abonnement p ON p.id = a.plan_id
     WHERE a.utilisateur_id = ? AND a.type_abonnement = 'ESSAI'
     ORDER BY a.date_fin DESC LIMIT 1`,
    [utilisateurId],
  );
  return { cree: true, abonnement: abonnements[0], compte };
}

export async function notifierActivationEssai(resultat) {
  if (!resultat?.cree || !resultat.compte || !resultat.abonnement) return false;
  try {
    await envoyerActivationEssai({
      email: resultat.compte.email,
      nom: resultat.compte.nom_affichage,
      dateFin: resultat.abonnement.date_fin,
    });
    return true;
  } catch (erreur) {
    console.error('Échec de l’e-mail d’activation de l’essai :', erreur.message);
    return false;
  }
}

export async function listerPlans() {
  const [lignes] = await baseDeDonnees.query('SELECT * FROM plans_abonnement WHERE est_actif = 1 ORDER BY prix_total');
  return lignes.map((plan) => ({
    ...plan,
    avantages: typeof plan.avantages === 'string' ? JSON.parse(plan.avantages) : plan.avantages,
  }));
}

export async function soumettrePaiement(donnees) {
  const [[utilisateurs], [plans]] = await Promise.all([
    baseDeDonnees.execute('SELECT id, role FROM utilisateurs WHERE code_utilisateur = ? LIMIT 1', [donnees.codeUtilisateur.toUpperCase()]),
    baseDeDonnees.execute('SELECT id, code_plan, prix_total, est_a_vie FROM plans_abonnement WHERE code_plan = ? AND est_actif = 1 LIMIT 1', [donnees.codePlan.toUpperCase()]),
  ]);
  const utilisateur = utilisateurs[0]; const plan = plans[0];
  if (!utilisateur || utilisateur.role !== 'UNIVERSITE') throw new ErreurApi(404, 'Compte institutionnel introuvable.');
  if (!plan) throw new ErreurApi(404, 'Pack d’abonnement introuvable.');
  const [[permanents], [paiementsEnAttente]] = await Promise.all([
    baseDeDonnees.execute(
      `SELECT a.id FROM abonnements_universite a
       JOIN plans_abonnement p ON p.id = a.plan_id
       WHERE a.utilisateur_id = ? AND a.statut = 'ACTIF' AND p.est_a_vie = 1 LIMIT 1`,
      [utilisateur.id],
    ),
    baseDeDonnees.execute(
      `SELECT id FROM paiements_abonnement
       WHERE utilisateur_id = ? AND plan_id = ? AND type_paiement = 'ABONNEMENT'
         AND statut = 'EN_ATTENTE' LIMIT 1`,
      [utilisateur.id, plan.id],
    ),
  ]);
  if (permanents[0]) throw new ErreurApi(409, 'Ce compte dispose déjà d’un accès à vie. Aucun autre paiement n’est nécessaire.');
  if (paiementsEnAttente[0]) throw new ErreurApi(409, 'Une preuve de paiement pour cette formule est déjà en attente de validation.');
  const montant = plan.prix_total;
  await baseDeDonnees.execute(
    `INSERT INTO paiements_abonnement
      (id, code_paiement, utilisateur_id, plan_id, type_paiement, montant, moyen_paiement, reference_paiement, url_preuve)
     VALUES (0, '', ?, ?, ?, ?, ?, ?, ?)`,
    [utilisateur.id, plan.id, donnees.typePaiement, montant, donnees.moyenPaiement, donnees.referencePaiement, donnees.urlPreuve ?? null],
  );
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM paiements_abonnement WHERE utilisateur_id = ? ORDER BY id DESC LIMIT 1', [utilisateur.id],
  );
  return lignes[0];
}

export async function listerPaiements(filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const where = filtres.statut ? "WHERE pa.type_paiement = 'ABONNEMENT' AND pa.statut = ?" : "WHERE pa.type_paiement = 'ABONNEMENT'";
  const valeurs = filtres.statut ? [filtres.statut] : [];
  const [[lignes], [compte]] = await Promise.all([
    baseDeDonnees.query(
      `SELECT pa.*, u.code_utilisateur, u.nom_affichage, u.email,
        p.code_plan, p.nom AS nom_plan, p.prix_acces, p.est_a_vie
       FROM paiements_abonnement pa
       JOIN utilisateurs u ON u.id = pa.utilisateur_id
       JOIN plans_abonnement p ON p.id = pa.plan_id
       ${where} ORDER BY FIELD(pa.statut, 'EN_ATTENTE', 'VALIDE', 'REJETE'), pa.date_creation DESC
       LIMIT ? OFFSET ?`, [...valeurs, limite, decalage]),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM paiements_abonnement pa ${where}`, valeurs),
  ]);
  return { paiements: lignes, meta: metaPagination(compte[0].total, page, limite) };
}

export async function traiterPaiement(code, adminId, donnees) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const [paiements] = await connexion.execute(
      `SELECT pa.*, p.duree_jours, p.est_a_vie, p.nom AS nom_plan,
         u.email, u.nom_affichage
       FROM paiements_abonnement pa
       JOIN plans_abonnement p ON p.id = pa.plan_id
       JOIN utilisateurs u ON u.id = pa.utilisateur_id
       WHERE pa.code_paiement = ? FOR UPDATE`, [code.toUpperCase()],
    );
    const paiement = paiements[0];
    if (!paiement) throw new ErreurApi(404, 'Paiement introuvable.');
    if (paiement.statut !== 'EN_ATTENTE') throw new ErreurApi(409, 'Ce paiement a déjà été traité.');
    if (paiement.type_paiement !== 'ABONNEMENT') throw new ErreurApi(409, 'Ce type de paiement n’est plus disponible.');
    await connexion.execute(
      `UPDATE paiements_abonnement SET statut = ?, commentaire_admin = ?, traite_par_id = ?, date_traitement = CURRENT_TIMESTAMP WHERE id = ?`,
      [donnees.statut, donnees.commentaire ?? null, adminId, paiement.id],
    );
    const abonnementActive = donnees.statut === 'VALIDE'
      ? await activerAbonnement(connexion, paiement)
      : null;
    const valide = donnees.statut === 'VALIDE';
    const message = valide
      ? (paiement.est_a_vie ? 'Votre accès CampusHub à vie est maintenant actif.' : 'Votre abonnement CampusHub est actif pour une année.')
      : (donnees.commentaire || 'Veuillez vérifier votre preuve de paiement.');
    await connexion.execute(
      `INSERT INTO notifications (id, code_notification, destinataire_id, type_notification, titre, message)
       VALUES (0, '', ?, 'ABONNEMENT', ?, ?)`,
      [paiement.utilisateur_id, valide ? 'Paiement validé' : 'Paiement rejeté', message],
    );
    await connexion.commit();
    try {
      await envoyerDecisionPaiement({
        email: paiement.email,
        nom: paiement.nom_affichage,
        codePaiement: paiement.code_paiement,
        statut: donnees.statut,
        commentaire: donnees.commentaire,
        montant: paiement.montant,
        dateFin: abonnementActive?.fin ?? null,
        nomPlan: paiement.nom_plan,
        estAVie: Boolean(paiement.est_a_vie),
      });
    } catch (erreurEmail) {
      console.error('Échec de l’e-mail de décision du paiement :', erreurEmail.message);
    }
    return await obtenirPaiement(code, connexion);
  } catch (erreur) { await connexion.rollback(); throw erreur; }
  finally { connexion.release(); }
}

async function activerAbonnement(connexion, paiement) {
  const [comptes] = await connexion.execute(
    'SELECT date_verification_email FROM utilisateurs WHERE id = ? LIMIT 1',
    [paiement.utilisateur_id],
  );
  if (!comptes[0]?.date_verification_email) {
    throw new ErreurApi(409, 'L’établissement doit confirmer son adresse e-mail avant son activation.');
  }
  const [precedents] = await connexion.execute(
    `SELECT date_fin FROM abonnements_universite WHERE utilisateur_id = ? AND statut = 'ACTIF' ORDER BY date_fin DESC LIMIT 1`,
    [paiement.utilisateur_id],
  );
  const debut = paiement.est_a_vie
    ? new Date()
    : (precedents[0]?.date_fin && new Date(precedents[0].date_fin) > new Date() ? precedents[0].date_fin : new Date());
  const fin = paiement.est_a_vie
    ? '9999-12-31 23:59:59'
    : new Date(new Date(debut).getTime() + paiement.duree_jours * 86400000);
  const [membres] = await connexion.execute(
    'SELECT universite_id FROM membres_universite WHERE utilisateur_id = ? AND est_proprietaire = 1 LIMIT 1', [paiement.utilisateur_id],
  );
  if (paiement.est_a_vie) {
    await connexion.execute(
      "UPDATE abonnements_universite SET statut = 'SUSPENDU' WHERE utilisateur_id = ? AND statut = 'ACTIF'",
      [paiement.utilisateur_id],
    );
  }
  await connexion.execute(
    `INSERT INTO abonnements_universite
      (id, code_abonnement, utilisateur_id, universite_id, plan_id, paiement_id,
       type_abonnement, date_debut, date_fin, certification_incluse)
     VALUES (0, '', ?, ?, ?, ?, 'PAYANT', ?, ?, 0)`,
    [paiement.utilisateur_id, membres[0]?.universite_id ?? null, paiement.plan_id, paiement.id, debut, fin],
  );
  await connexion.execute(
    `UPDATE utilisateurs SET statut_compte = 'ACTIF', statut_verification = 'VERIFIE'
     WHERE id = ?`,
    [paiement.utilisateur_id],
  );
  return { debut, fin };
}

async function obtenirPaiement(code, connexion = baseDeDonnees) {
  const [lignes] = await connexion.execute('SELECT * FROM paiements_abonnement WHERE code_paiement = ?', [code.toUpperCase()]);
  return lignes[0];
}

export async function obtenirMonAbonnement(utilisateurId) {
  await baseDeDonnees.execute("UPDATE abonnements_universite a JOIN plans_abonnement p ON p.id = a.plan_id SET a.statut = 'EXPIRE' WHERE a.statut = 'ACTIF' AND p.est_a_vie = 0 AND a.date_fin < CURRENT_TIMESTAMP");
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM vue_abonnements_universites WHERE utilisateur_id = ? ORDER BY date_fin DESC LIMIT 1', [utilisateurId],
  );
  return lignes[0] ?? null;
}

export async function listerAbonnements() {
  await baseDeDonnees.execute("UPDATE abonnements_universite a JOIN plans_abonnement p ON p.id = a.plan_id SET a.statut = 'EXPIRE' WHERE a.statut = 'ACTIF' AND p.est_a_vie = 0 AND a.date_fin < CURRENT_TIMESTAMP");
  const [lignes] = await baseDeDonnees.query('SELECT * FROM vue_abonnements_universites ORDER BY statut, date_fin');
  return lignes;
}

export async function obtenirRapportsFinanciers(filtres = {}, utilisateurId = null) {
  const conditions = ["pa.type_paiement = 'ABONNEMENT'"];
  const valeurs = [];
  if (utilisateurId) { conditions.push('pa.utilisateur_id = ?'); valeurs.push(utilisateurId); }
  if (filtres.statut) { conditions.push('pa.statut = ?'); valeurs.push(filtres.statut); }
  if (filtres.codeUtilisateur) { conditions.push('ut.code_utilisateur = ?'); valeurs.push(filtres.codeUtilisateur.toUpperCase()); }
  if (filtres.dateDebut) { conditions.push('DATE(pa.date_creation) >= ?'); valeurs.push(filtres.dateDebut); }
  if (filtres.dateFin) { conditions.push('DATE(pa.date_creation) <= ?'); valeurs.push(filtres.dateFin); }

  const [paiements] = await baseDeDonnees.execute(
    `SELECT pa.code_paiement, pa.montant, pa.devise, pa.moyen_paiement,
       pa.reference_paiement, pa.statut, pa.commentaire_admin,
       pa.date_creation, pa.date_traitement,
       ut.code_utilisateur, ut.nom_affichage, ut.email, univ.telephone,
       p.code_plan, p.nom AS nom_plan, p.duree_jours, p.est_a_vie,
       a.code_abonnement, a.date_debut AS date_abonnement_debut,
       a.date_fin AS date_abonnement_fin, a.statut AS statut_abonnement,
       GREATEST(DATEDIFF(a.date_fin, CURRENT_TIMESTAMP), 0) AS jours_restants,
       COALESCE(univ.code_universite, '') AS code_universite,
       COALESCE(univ.nom, ut.nom_affichage) AS nom_etablissement,
       COALESCE(univ.ville, ut.ville) AS ville,
       COALESCE(univ.province, ut.province) AS province,
       admin.nom_affichage AS traite_par
     FROM paiements_abonnement pa
     JOIN utilisateurs ut ON ut.id = pa.utilisateur_id
     JOIN plans_abonnement p ON p.id = pa.plan_id
     LEFT JOIN abonnements_universite a ON a.paiement_id = pa.id
     LEFT JOIN membres_universite mu ON mu.utilisateur_id = ut.id AND mu.est_proprietaire = 1
     LEFT JOIN universites univ ON univ.id = COALESCE(a.universite_id, mu.universite_id)
     LEFT JOIN utilisateurs admin ON admin.id = pa.traite_par_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY pa.date_creation DESC
     LIMIT 5000`,
    valeurs,
  );

  const resume = paiements.reduce((total, paiement) => {
    total.nombrePaiements += 1;
    total.montantTotal += Number(paiement.montant || 0);
    if (paiement.statut === 'VALIDE') {
      total.nombreValides += 1;
      total.montantValide += Number(paiement.montant || 0);
    } else if (paiement.statut === 'EN_ATTENTE') {
      total.nombreEnAttente += 1;
      total.montantEnAttente += Number(paiement.montant || 0);
    } else if (paiement.statut === 'REJETE') total.nombreRejetes += 1;
    total.clients.add(paiement.code_utilisateur);
    return total;
  }, { nombrePaiements: 0, nombreValides: 0, nombreEnAttente: 0, nombreRejetes: 0, montantTotal: 0, montantValide: 0, montantEnAttente: 0, clients: new Set() });

  return {
    paiements,
    resume: { ...resume, nombreClients: resume.clients.size, clients: undefined },
  };
}

export async function obtenirMesDocumentsFinanciers(utilisateurId) {
  return obtenirRapportsFinanciers({}, utilisateurId);
}
