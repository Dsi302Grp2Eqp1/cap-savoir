const utilisateurs = require('../repositories/utilisateurs');
const ErreurApi = require('../utils/erreur-api');
const motDePasse = require('../utils/mot-de-passe');
const jeton = require('../utils/jeton');

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_CONNEXION = 'Email ou mot de passe incorrect.';

function validerTexte(valeur, champ, longueurMax) {
  if (typeof valeur !== 'string' || !valeur.trim() || valeur.trim().length > longueurMax) {
    throw new ErreurApi(400, `${champ} invalide (obligatoire, maximum ${longueurMax} caractères).`);
  }
  return valeur.trim();
}

function normaliserEmail(email) {
  const valeur = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!FORMAT_EMAIL.test(valeur) || valeur.length > 254) {
    throw new ErreurApi(400, 'Email invalide.');
  }
  return valeur;
}

// Données renvoyées au client : jamais le hachage ni la version de session.
function profilPublic(utilisateur) {
  return {
    _id: utilisateur._id,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    email: utilisateur.email,
    roles: utilisateur.roles,
    dateCreation: utilisateur.dateCreation,
  };
}

// US01 : création d'un compte apprenant.
async function inscrire(donnees) {
  const nom = validerTexte(donnees.nom, 'Nom', 100);
  const prenom = validerTexte(donnees.prenom, 'Prénom', 100);
  const email = normaliserEmail(donnees.email);
  if (!motDePasse.estValide(donnees.motDePasse)) {
    throw new ErreurApi(
      400,
      `Mot de passe trop faible : au moins ${motDePasse.LONGUEUR_MIN} caractères, avec au moins une lettre et un chiffre.`,
    );
  }

  try {
    const utilisateur = await utilisateurs.creer({
      nom,
      prenom,
      email,
      motDePasse: await motDePasse.hacher(donnees.motDePasse),
      roles: ['APPRENANT'], // les autres rôles sont attribués par un agent (US38)
      dateCreation: new Date(),
    });
    return profilPublic(utilisateur);
  } catch (err) {
    // Index unique sur email : la base refuse les doublons, même en cas d'envois simultanés.
    if (err?.code === 11000) {
      throw new ErreurApi(409, 'Cet email est déjà utilisé.');
    }
    throw err;
  }
}

// US02 : connexion. Le message d'erreur ne révèle pas le champ fautif.
async function connecter(donnees) {
  const email = typeof donnees.email === 'string' ? donnees.email.trim().toLowerCase() : '';
  const utilisateur = email ? await utilisateurs.trouverParEmailAvecMotDePasse(email) : null;

  // La comparaison est faite même sans compte, pour un temps de réponse identique.
  const valide = await motDePasse.comparer(donnees.motDePasse, utilisateur?.motDePasse);
  if (!utilisateur || !valide) {
    throw new ErreurApi(401, MESSAGE_CONNEXION);
  }

  return { jeton: jeton.signer(utilisateur), utilisateur: profilPublic(utilisateur) };
}

// US02 : déconnexion. Incrémenter la version invalide tous les jetons déjà émis.
async function deconnecter(utilisateur) {
  await utilisateurs.incrementerVersionJeton(utilisateur._id);
}

module.exports = { inscrire, connecter, deconnecter, profilPublic };
