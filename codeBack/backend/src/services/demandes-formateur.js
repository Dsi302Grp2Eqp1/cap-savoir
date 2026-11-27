// Parcours « devenir formateur » :
//   US05 l'apprenant dépose sa demande (front-office, API JSON)
//   US06 l'agent consulte les demandes (back-office EJS)
//   US38 l'agent accepte ou refuse (back-office EJS)
//   US07 l'utilisateur voit la décision et le motif (front-office, API JSON)
const mongoose = require('mongoose');
const demandes = require('../repositories/demandes-formateur');
const utilisateurs = require('../repositories/utilisateurs');
const stockageCv = require('../utils/stockage-cv');
const ErreurApi = require('../utils/erreur-api');

const STATUTS = ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE'];

function texte(valeur, champ, longueurMax) {
  if (typeof valeur !== 'string' || !valeur.trim() || valeur.trim().length > longueurMax) {
    throw new ErreurApi(400, `${champ} invalide (obligatoire, maximum ${longueurMax} caractères).`);
  }
  return valeur.trim();
}

function verifierId(id) {
  if (!mongoose.isValidObjectId(id)) throw new ErreurApi(404, 'Demande introuvable.');
}

// Ce que le demandeur voit de sa demande (US07) : pas l'identifiant de l'agent.
function vuePublique(demande) {
  return {
    _id: demande._id,
    statut: demande.statut,
    dateSoumission: demande.dateSoumission,
    dateDecision: demande.dateDecision,
    commentaire: demande.commentaire,
    domaineExpertise: demande.domaineExpertise,
    experience: demande.experience,
    cv: { nom: demande.cv?.nom },
  };
}

// US05
async function deposer(utilisateur, donnees, fichier) {
  if (utilisateur.roles.includes('FORMATEUR')) {
    throw new ErreurApi(409, 'Vous êtes déjà formateur.');
  }
  const domaineExpertise = texte(donnees.domaineExpertise, "Domaine d'expertise", 200);
  const experience = texte(donnees.experience, 'Expérience', 3000);
  if (await demandes.trouverEnAttente(utilisateur._id)) {
    throw new ErreurApi(409, 'Vous avez déjà une demande en attente.');
  }

  const cv = await stockageCv.enregistrer(fichier);
  try {
    const demande = await demandes.creer({
      demandeur: { _id: utilisateur._id, nom: utilisateur.nom, prenom: utilisateur.prenom },
      dateSoumission: new Date(),
      statut: 'EN_ATTENTE',
      cv,
      experience,
      domaineExpertise,
    });
    return vuePublique(demande);
  } catch (err) {
    await stockageCv.supprimer(cv.url); // pas de fichier orphelin si l'insertion échoue
    throw err;
  }
}

// US07
async function mesDemandes(utilisateur) {
  return (await demandes.listerParDemandeur(utilisateur._id)).map(vuePublique);
}

// US06 : un statut inconnu revient à « toutes ».
async function lister(statut) {
  return demandes.lister(STATUTS.includes(statut) ? statut : null);
}

async function detail(id) {
  verifierId(id);
  const demande = await demandes.trouverParId(id);
  if (!demande) throw new ErreurApi(404, 'Demande introuvable.');
  return demande;
}

async function cheminCv(id) {
  const demande = await detail(id);
  return { chemin: stockageCv.chemin(demande.cv.url), nom: demande.cv.nom };
}

// US38 : une demande traitée ne peut pas l'être une deuxième fois.
async function decider(id, agent, statut, commentaire) {
  verifierId(id);
  const demande = await demandes.enregistrerDecision(id, {
    statut,
    commentaire,
    agentId: agent._id,
    dateDecision: new Date(),
  });
  if (!demande) {
    await detail(id); // 404 si elle n'existe pas
    throw new ErreurApi(409, 'Cette demande a déjà été traitée.');
  }
  return demande;
}

async function accepter(id, agent) {
  const demande = await decider(id, agent, 'ACCEPTEE', null);
  await utilisateurs.devenirFormateur(demande.demandeur._id, demande.domaineExpertise);
  return demande;
}

async function refuser(id, agent, motif) {
  const commentaire = texte(motif, 'Motif du refus', 2000);
  return decider(id, agent, 'REFUSEE', commentaire);
}

module.exports = { STATUTS, deposer, mesDemandes, lister, detail, cheminCv, accepter, refuser };
