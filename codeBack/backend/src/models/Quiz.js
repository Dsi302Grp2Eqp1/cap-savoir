// Collection Quiz — traduction Mongoose de db/schemas/Quiz.js
const { Schema, model } = require('mongoose');
const { auMoins, options } = require('./_commun');

const propositionSchema = new Schema({
  texte:       { type: String, required: true, minlength: 1 },
  estCorrecte: { type: Boolean, required: true }
});

const questionSchema = new Schema({
  enonce:       { type: String, required: true, minlength: 1 },
  points:       { type: Number, required: true, min: 0 },
  explication:  String, // affichée avec la correction (US25)
  // une seule estCorrecte = true (vérifié par l'application)
  propositions: { type: [propositionSchema], validate: auMoins(2) }
});

const quizSchema = new Schema({
  formationId:  { type: Schema.Types.ObjectId, required: true },
  chapitreId:   { type: Schema.Types.ObjectId, required: true },
  titre:        { type: String, required: true, minlength: 1 },
  scoreMinimum: { type: Number, required: true, min: 0, max: 100 }, // en % (US22)
  questions:    { type: [questionSchema], validate: auMoins(1) }
}, options('Quiz'));

quizSchema.index({ chapitreId: 1 }, { unique: true }); // 1 quiz par chapitre
quizSchema.index({ formationId: 1 });

module.exports = model('Quiz', quizSchema);
