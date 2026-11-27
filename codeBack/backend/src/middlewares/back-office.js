const { utilisateurDepuisJeton } = require('./authentification');

const COOKIE = 'capsavoir_bo';
const DUREE_MS = 2 * 60 * 60 * 1000; // identique à la durée du jeton (2h)

function lireCookie(req) {
  for (const morceau of (req.get('Cookie') || '').split(';')) {
    const [nom, ...valeur] = morceau.trim().split('=');
    if (nom === COOKIE) return decodeURIComponent(valeur.join('='));
  }
  return null;
}

function ouvrirSession(req, res, jeton) {
  res.cookie(COOKIE, jeton, {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure || req.get('X-Forwarded-Proto') === 'https',
    path: '/backoffice',
    maxAge: DUREE_MS,
  });
}

function fermerSession(res) {
  res.clearCookie(COOKIE, { path: '/backoffice' });
}

// Sans session agent valide, retour à la page de connexion du back-office.
async function exigerAgent(req, res, next) {
  let utilisateur;
  try {
    utilisateur = await utilisateurDepuisJeton(lireCookie(req));
  } catch (err) {
    if (err.statut !== 401) return next(err); // panne de base : page d'erreur
    utilisateur = null;
  }
  if (!utilisateur?.roles.includes('AGENT')) {
    fermerSession(res);
    return res.redirect('/backoffice/connexion');
  }
  req.utilisateur = utilisateur;
  res.locals.agent = utilisateur;
  next();
}

module.exports = { exigerAgent, ouvrirSession, fermerSession };
