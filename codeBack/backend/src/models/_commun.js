// Éléments communs — traduction Mongoose de db/schemas/_commun.js
const { Schema } = require('mongoose');

// Sous-document Fichier (Image, Document, contenu d'une Ressource)
const fichierSchema = new Schema({
  nom:    { type: String, required: true },
  format: { type: String, required: true },   // extension ou type MIME
  taille: { type: Number, required: true, min: 0 },
  url:    { type: String, required: true }
}, { _id: false });

// Résumé d'une personne copié dans un autre document (modèle hybride)
const resumePersonneSchema = new Schema({
  _id:    { type: Schema.Types.ObjectId, required: true },
  nom:    { type: String, required: true },
  prenom: { type: String, required: true }
}, { _id: false });

// Équivalent de minItems du $jsonSchema
const auMoins = (n) => ({
  validator: (tableau) => Array.isArray(tableau) && tableau.length >= n,
  message: `au moins ${n} élément(s) requis`
});

// Le nom de collection est forcé (pas de pluriel automatique Mongoose).
const options = (collection) => ({ collection, versionKey: false });

module.exports = { fichierSchema, resumePersonneSchema, auMoins, options };
