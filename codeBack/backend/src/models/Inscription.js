// Collection Inscription — traduction Mongoose de db/schemas/Inscription.js
const { Schema, model } = require('mongoose');
const { options } = require('./_commun');

const paiementSchema = new Schema({
  montant:              { type: Number, required: true, min: 0 },
  datePaiement:         { type: Date, default: null },
  moyen:                { type: String, required: true, minlength: 1 },
  referenceTransaction: { type: String, minlength: 1 },
  statut:               { type: String, required: true, enum: ['EN_ATTENTE', 'CONFIRME', 'ECHOUE'] }
});

const chapitreConsulteSchema = new Schema({
  chapitreId:               { type: Schema.Types.ObjectId, required: true },
  dateDerniereConsultation: { type: Date, required: true },
  dateTerminaison:          { type: Date, default: null }
}, { _id: false });

const inscriptionSchema = new Schema({
  apprenantId:        { type: Schema.Types.ObjectId, required: true },
  formationId:        { type: Schema.Types.ObjectId, required: true },
  dateInscription:    { type: Date, required: true, default: Date.now },
  statut:             { type: String, required: true, enum: ['EN_ATTENTE_PAIEMENT', 'ACTIVE', 'ANNULEE'] },
  paiements:          { type: [paiementSchema], default: [] },
  chapitresConsultes: { type: [chapitreConsulteSchema], default: [] }
}, options('Inscription'));

// Une inscription par apprenant/formation ; une réactivation met à jour ce document.
inscriptionSchema.index({ apprenantId: 1, formationId: 1 }, { unique: true });
inscriptionSchema.index({ apprenantId: 1, statut: 1 });
inscriptionSchema.index({ formationId: 1, statut: 1 });
inscriptionSchema.index({ 'paiements.referenceTransaction': 1 });

module.exports = model('Inscription', inscriptionSchema);
