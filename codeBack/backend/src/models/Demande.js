// Collection Demande — traduction Mongoose de db/schemas/Demande.js
const { Schema, model } = require('mongoose');
const { fichierSchema, resumePersonneSchema, options } = require('./_commun');

const estFormateur = function () { return this.type === 'FORMATEUR'; };
const estValidation = function () { return this.type === 'VALIDATION'; };

const demandeSchema = new Schema({
  type:           { type: String, required: true, enum: ['FORMATEUR', 'VALIDATION'] },
  demandeur:      { type: resumePersonneSchema, required: true },
  dateSoumission: { type: Date, required: true, default: Date.now },
  statut:         { type: String, required: true, enum: ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE'], default: 'EN_ATTENTE' },
  agentId:        { type: Schema.Types.ObjectId, default: null }, // agent qui a traité la demande
  dateDecision:   { type: Date, default: null },
  commentaire:    { type: String, default: null },                // obligatoire en cas de refus (code applicatif)
  // champs DemandeFormateur (obligatoires si type = FORMATEUR)
  cv:               { type: fichierSchema, required: estFormateur },
  experience:       { type: String, required: estFormateur },
  domaineExpertise: { type: String, required: estFormateur },
  // champs DemandeValidation (obligatoires si type = VALIDATION)
  formationId:    { type: Schema.Types.ObjectId, required: estValidation },
  typeValidation: { type: String, enum: ['NOUVELLE_FORMATION', 'MODIFICATION'], required: estValidation },
  contenuPropose: { type: Schema.Types.Mixed } // version modifiée de la formation (MODIFICATION)
}, options('Demande'));

// US05 : une seule demande formateur EN_ATTENTE par utilisateur.
// Cosmos DB ne gère pas les index uniques partiels : la règle est vérifiée par
// le backend avant l'insertion, cet index rend la vérification rapide.
demandeSchema.index({ 'demandeur._id': 1, type: 1, statut: 1 });
demandeSchema.index({ type: 1, statut: 1, dateSoumission: -1 }); // US06, US39
demandeSchema.index({ agentId: 1, dateDecision: -1 });           // US36 historique

module.exports = model('Demande', demandeSchema);
