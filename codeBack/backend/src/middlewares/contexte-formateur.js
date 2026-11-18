const { isObjectIdOrHexString } = require("mongoose");
const { Utilisateur } = require("../models");
const ErreurApi = require("../utils/erreur-api");


async function formateur(req, res, next) {
  try {
    if (!isObjectIdOrHexString(process.env.FORMATEUR_ID)) {
      throw new ErreurApi(
        503,
        "Configurer FORMATEUR_ID avec le profil formateur de votre base.",
      );
    }
    const utilisateur = await Utilisateur.findById(
      process.env.FORMATEUR_ID,
    ).select("nom prenom roles");
    if (!utilisateur) throw new ErreurApi(404, "Profil formateur introuvable.");
    if (!utilisateur.roles.includes("FORMATEUR"))
      throw new ErreurApi(
        403,
        "Le profil configuré doit avoir le rôle FORMATEUR.",
      );
    req.utilisateur = utilisateur;
    next();
  } catch (err) {
    next(err);
  }
}
module.exports = { formateur };
