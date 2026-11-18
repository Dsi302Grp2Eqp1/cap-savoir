// Création et vérification des jetons JWT de session (US02).
const jwt = require('jsonwebtoken');
const ErreurApi = require('./erreur-api');

const DUREE_PAR_DEFAUT = '2h';

function secret() {
  const valeur = process.env.JWT_SECRET;
  if (!valeur) {
    throw new ErreurApi(503, 'Configurer JWT_SECRET côté serveur.');
  }
  return valeur;
}

// Le jeton contient l'identifiant et la version de session de l'utilisateur.
// Les rôles ne sont pas copiés : ils sont relus en base à chaque requête,
// ce qui applique immédiatement un changement de rôle (US38).
function signer(utilisateur) {
  return jwt.sign(
    { v: utilisateur.versionJeton ?? 0 },
    secret(),
    {
      subject: String(utilisateur._id),
      expiresIn: process.env.JWT_DUREE || DUREE_PAR_DEFAUT,
      algorithm: 'HS256',
    },
  );
}

// Renvoie { sub, v } ou lève une erreur 401 (jeton absent, modifié ou expiré).
function verifier(jeton) {
  try {
    return jwt.verify(jeton, secret(), { algorithms: ['HS256'] });
  } catch (err) {
    if (err instanceof ErreurApi) throw err;
    throw new ErreurApi(401, 'Session expirée ou invalide. Reconnectez-vous.');
  }
}

module.exports = { signer, verifier };
