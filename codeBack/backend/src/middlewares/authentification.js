// US02 / US03 : authentification par jeton et contrôle des rôles côté serveur.
//
// Utilisation dans une route :
//   const { authentifier, exigerRole } = require('../middlewares/authentification');
//   router.use(authentifier, exigerRole('FORMATEUR'));
//
// Après authentifier, req.utilisateur contient { _id, nom, prenom, email, roles, dateCreation }.
const utilisateurs = require('../repositories/utilisateurs');
const ErreurApi = require('../utils/erreur-api');
const jeton = require('../utils/jeton');

const ROLES = ['APPRENANT', 'FORMATEUR', 'AGENT'];

function lireJeton(req) {
  const [schema, valeur] = (req.get('Authorization') || '').split(' ');
  return schema === 'Bearer' && valeur ? valeur : null;
}

// Partagé par l'API (en-tête Authorization) et le back-office (cookie).
// Relu à chaque requête : rôles à jour et déconnexion effective immédiatement.
async function utilisateurDepuisJeton(brut) {
  if (!brut) throw new ErreurApi(401, 'Connexion requise.');
  const contenu = jeton.verifier(brut);
  const utilisateur = await utilisateurs.trouverPourSession(contenu.sub);
  if (!utilisateur || (utilisateur.versionJeton ?? 0) !== contenu.v) {
    throw new ErreurApi(401, 'Session expirée ou invalide. Reconnectez-vous.');
  }
  return utilisateur;
}

async function authentifier(req, res, next) {
  try {
    req.utilisateur = await utilisateurDepuisJeton(lireJeton(req));
    next();
  } catch (err) {
    next(err);
  }
}

// À placer après authentifier. Autorise si l'utilisateur possède au moins un des rôles.
function exigerRole(...roles) {
  const inconnus = roles.filter((role) => !ROLES.includes(role));
  if (!roles.length || inconnus.length) {
    throw new Error(`exigerRole : rôle(s) invalide(s) ${inconnus.join(', ')}`);
  }
  return (req, res, next) => {
    if (!req.utilisateur) return next(new ErreurApi(401, 'Connexion requise.'));
    if (!roles.some((role) => req.utilisateur.roles.includes(role))) {
      return next(new ErreurApi(403, 'Accès réservé à un autre rôle.'));
    }
    next();
  };
}

module.exports = { authentifier, exigerRole, utilisateurDepuisJeton, ROLES };
