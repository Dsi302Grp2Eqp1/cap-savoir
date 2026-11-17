const service = require('../services/fichiers');
const ErreurApi = require('../utils/erreur-api');

async function televerser(req, res) {
  const fichier = await service.enregistrer(req.utilisateur._id, req.query.type, req.file);
  res.status(201).json(fichier);
}

async function telecharger(req, res) {
  if (req.params.utilisateurId !== String(req.utilisateur._id)) {
    throw new ErreurApi(404, 'Fichier introuvable.');
  }

  const url = `/api/fichiers/${req.params.utilisateurId}/${req.params.fichierId}`;
  const fichier = await service.retrouver(req.utilisateur._id, url);

  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'private, no-store');
  res.download(fichier.chemin, fichier.metadata.nom);
}

module.exports = { televerser, telecharger };
