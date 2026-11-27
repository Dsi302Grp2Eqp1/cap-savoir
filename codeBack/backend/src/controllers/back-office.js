// Back-office agent (pages EJS) : connexion, demandes formateur (US06, US38).
const auth = require('../services/auth');
const demandes = require('../services/demandes-formateur');
const { ouvrirSession, fermerSession } = require('../middlewares/back-office');

function pageConnexion(req, res) {
  res.render('back-office/connexion', { erreur: null, email: '' });
}

// Même vérification que l'API (US02), puis contrôle du rôle AGENT.
async function connecter(req, res) {
  const email = req.body?.email || '';
  try {
    const session = await auth.connecter(req.body || {});
    if (!session.utilisateur.roles.includes('AGENT')) {
      return res.status(403).render('back-office/connexion', {
        erreur: 'Accès réservé aux agents.',
        email,
      });
    }
    ouvrirSession(req, res, session.jeton);
    res.redirect('/backoffice/demandes');
  } catch (err) {
    if (err.statut !== 401) throw err;
    res.status(401).render('back-office/connexion', { erreur: err.message, email });
  }
}

async function deconnecter(req, res) {
  await auth.deconnecter(req.utilisateur);
  fermerSession(res);
  res.redirect('/backoffice/connexion');
}

// US06 : liste filtrée par statut (EN_ATTENTE par défaut).
async function listerDemandes(req, res) {
  const statut = req.query.statut ?? 'EN_ATTENTE';
  res.render('back-office/demandes', {
    demandes: await demandes.lister(statut),
    statut,
    statuts: demandes.STATUTS,
  });
}

async function detailDemande(req, res) {
  res.render('back-office/demande', {
    demande: await demandes.detail(req.params.id),
    erreur: null,
    message: req.query.ok === 'acceptee' ? 'Demande acceptée.' : req.query.ok === 'refusee' ? 'Demande refusée.' : null,
  });
}

// Le CV est envoyé en pièce jointe, jamais affiché depuis une URL publique.
async function telechargerCv(req, res) {
  const cv = await demandes.cheminCv(req.params.id);
  res.download(cv.chemin, cv.nom);
}

// US38 : en cas d'erreur (motif manquant, déjà traitée), la page est réaffichée avec le message.
async function decider(req, res, resultat, action) {
  try {
    await action();
    res.redirect(`/backoffice/demandes/${req.params.id}?ok=${resultat}`);
  } catch (err) {
    if (err.statut !== 400 && err.statut !== 409) throw err;
    res.status(err.statut).render('back-office/demande', {
      demande: await demandes.detail(req.params.id),
      erreur: err.message,
      message: null,
    });
  }
}

function accepter(req, res) {
  return decider(req, res, 'acceptee', () => demandes.accepter(req.params.id, req.utilisateur));
}

function refuser(req, res) {
  return decider(req, res, 'refusee', () =>
    demandes.refuser(req.params.id, req.utilisateur, req.body?.motif ?? ''),
  );
}

module.exports = {
  pageConnexion,
  connecter,
  deconnecter,
  listerDemandes,
  detailDemande,
  telechargerCv,
  accepter,
  refuser,
};
