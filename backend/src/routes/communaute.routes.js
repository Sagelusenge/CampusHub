import { Router } from 'express';
import * as c from '../controllers/communaute.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaCodeDemandeInscription, schemaCodePartenaire, schemaCodeRelation,
  schemaCodeUniversiteCommunaute, schemaCodeUtilisateur, schemaDemandeInscription,
  schemaFormulaireInscription, schemaInvitationRelation, schemaPartenaire,
  schemaRechercheRelations, schemaReponseRelation, schemaTraitementInscription,
} from '../schemas/communaute.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeCommunaute = Router();

routeCommunaute.get('/inscriptions/universites/:codeUniversite/formulaire', valider(schemaCodeUniversiteCommunaute, 'params'), ga(c.formulairePublic));
routeCommunaute.get('/partenaires/universites/:codeUniversite', valider(schemaCodeUniversiteCommunaute, 'params'), ga(c.partenairesPublics));

routeCommunaute.use(authentifier);
routeCommunaute.get('/relations/suggestions', valider(schemaRechercheRelations, 'query'), ga(c.suggestions));
routeCommunaute.get('/relations/invitations', ga(c.invitations));
routeCommunaute.get('/relations', ga(c.relations));
routeCommunaute.post('/relations/invitations', valider(schemaInvitationRelation), ga(c.inviter));
routeCommunaute.patch('/relations/invitations/:code', valider(schemaCodeRelation, 'params'), valider(schemaReponseRelation), ga(c.repondre));
routeCommunaute.delete('/relations/:codeUtilisateur', valider(schemaCodeUtilisateur, 'params'), ga(c.retirer));

routeCommunaute.post('/inscriptions/universites/:codeUniversite/demandes',
  autoriserRoles('VISITEUR', 'ETUDIANT'),
  valider(schemaCodeUniversiteCommunaute, 'params'), valider(schemaDemandeInscription), ga(c.soumettreInscription));
routeCommunaute.get('/inscriptions/moi/formulaire', autoriserRoles('UNIVERSITE'), ga(c.formulaireGestionnaire));
routeCommunaute.put('/inscriptions/moi/formulaire', autoriserRoles('UNIVERSITE'), valider(schemaFormulaireInscription), ga(c.enregistrerFormulaire));
routeCommunaute.get('/inscriptions/moi/demandes', autoriserRoles('UNIVERSITE'), ga(c.demandesInscription));
routeCommunaute.patch('/inscriptions/demandes/:code', autoriserRoles('UNIVERSITE'), valider(schemaCodeDemandeInscription, 'params'), valider(schemaTraitementInscription), ga(c.traiterInscription));

routeCommunaute.get('/partenaires/moi', autoriserRoles('UNIVERSITE'), ga(c.partenairesGestionnaire));
routeCommunaute.post('/partenaires', autoriserRoles('UNIVERSITE'), valider(schemaPartenaire), ga(c.creerPartenaire));
routeCommunaute.delete('/partenaires/:code', autoriserRoles('UNIVERSITE'), valider(schemaCodePartenaire, 'params'), ga(c.supprimerPartenaire));
