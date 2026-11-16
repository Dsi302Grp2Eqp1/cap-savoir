// Collection Formation — traduction Mongoose de db/schemas/Formation.js
const { Schema, model } = require('mongoose');
const { fichierSchema, resumePersonneSchema, auMoins, options } = require('./_commun');

const ressourceSchema = new Schema({            // _id ajouté automatiquement
  titre:   { type: String, required: true, minlength: 1 },
  type:    { type: String, required: true, enum: ['VIDEO', 'PDF', 'TEXTE', 'IMAGE', 'PRESENTATION'] }, // US10
  contenu: { type: fichierSchema, required: true },
  ordre:   { type: Number, required: true, min: 1 }
});

const chapitreSchema = new Schema({             // _id ajouté automatiquement
  titre:       { type: String, required: true, minlength: 1 },
  description: String,
  ordre:       { type: Number, required: true, min: 1 },
  quizId:      { type: Schema.Types.ObjectId, default: null },
  ressources:  { type: [ressourceSchema], default: [] }
});

const formationSchema = new Schema({
  titre:        { type: String, required: true, minlength: 1 },
  description:  { type: String, required: true, minlength: 1 },
  categories:   { type: [String], validate: auMoins(1) },
  prix:         { type: Number, required: true, min: 0 },
  image:        { type: fichierSchema, required: true },
  statut:       { type: String, required: true, enum: ['BROUILLON', 'SOUMISE', 'PUBLIEE', 'ARCHIVEE'] },
  dateCreation: { type: Date, required: true, default: Date.now },
  formateur:    { type: resumePersonneSchema, required: true },
  // vide en brouillon ; au moins 1 chapitre exigé à la soumission (code applicatif, US11)
  chapitres:    { type: [chapitreSchema], default: [] }
}, options('Formation'));

formationSchema.index({ statut: 1, categories: 1, prix: 1 }); // US16 catalogue + filtres
// Cosmos DB ne gère pas les index "text" : la recherche (US16, US40) se fait par
// expression régulière sur le titre, appuyée par cet index.
formationSchema.index({ titre: 1 });
formationSchema.index({ 'formateur._id': 1, statut: 1 });     // US15 tableau de bord formateur

module.exports = model('Formation', formationSchema);
