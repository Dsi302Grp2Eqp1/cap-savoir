// Collection Tentative — traduction Mongoose de db/schemas/Tentative.js
const { Schema, model } = require('mongoose');
const { options } = require('./_commun');

const reponseSchema = new Schema({
  questionId:    { type: Schema.Types.ObjectId, required: true },
  propositionId: { type: Schema.Types.ObjectId, required: true },
  estCorrecte:   { type: Boolean, required: true },
  pointsObtenus: { type: Number, required: true, min: 0 }
});

const tentativeSchema = new Schema({
  apprenantId:     { type: Schema.Types.ObjectId, required: true },
  quizId:          { type: Schema.Types.ObjectId, required: true },
  numeroTentative: {
    type: Number, required: true, min: 1,
    validate: { validator: Number.isInteger, message: 'numeroTentative doit être un entier' }
  },
  dateDebut: { type: Date, required: true, default: Date.now },
  dateFin:   { type: Date, default: null },
  score:     { type: Number, min: 0, max: 100 },  // calculé par le backend à la soumission
  valide:    Boolean,
  reponses:  { type: [reponseSchema], default: [] } // peut être vide pendant une tentative en cours
}, options('Tentative'));

tentativeSchema.index({ apprenantId: 1, quizId: 1, numeroTentative: 1 }, { unique: true });
tentativeSchema.index({ apprenantId: 1, dateDebut: -1 });
tentativeSchema.index({ quizId: 1, valide: 1 });

module.exports = model('Tentative', tentativeSchema);
