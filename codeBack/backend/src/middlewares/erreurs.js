module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let statut = err.statut || 500;
  let message = err.message;
  if (
    err.name === "ValidationError" ||
    err.name === "CastError" ||
    err.type === "entity.parse.failed"
  ) {
    statut = 400;
    message = "Données invalides.";
  }
  if (err.name === "VersionError") {
    statut = 409;
    message = "Formation modifiée ailleurs. Rechargez la page.";
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    statut = 413;
    message = "Fichier trop volumineux (maximum 50 Mo).";
  } else if (err.name === "MulterError") {
    statut = 400;
    message = "Envoyer un seul fichier dans le champ fichier.";
  }
  if (err.type === "entity.too.large") {
    statut = 413;
    message = "Requête trop volumineuse.";
  }
  if (statut === 500) {
    console.error(err);
    message = "Erreur interne du serveur.";
  }
  res.status(statut).json({ erreur: message });
};
