// Collection Certificat — traduction Mongoose de db/schemas/Certificat.js
const { Schema, model } = require('mongoose');
const { fichierSchema, options } = require('./_commun');

const certificatSchema = new Schema({
  apprenantId:       { type: Schema.Types.ObjectId, required: true },
  formationId:       { type: Schema.Types.ObjectId, required: true },
  identifiantUnique: { type: String, required: true, minlength: 1 },
  dateDelivrance:    { type: Date, required: true, default: Date.now },
  codeQR:            { type: String, required: true, minlength: 1 }, // contenu ou URL de vérification
  document:          fichierSchema
}, options('Certificat'));

certificatSchema.index({ identifiantUnique: 1 }, { unique: true });
certificatSchema.index({ apprenantId: 1, formationId: 1 }, { unique: true });
certificatSchema.index({ formationId: 1, dateDelivrance: -1 });

module.exports = model('Certificat', certificatSchema);
