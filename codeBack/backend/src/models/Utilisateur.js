// Collection Utilisateur — traduction Mongoose de db/schemas/Utilisateur.js
const { Schema, model } = require('mongoose');
const { auMoins, options } = require('./_commun');

const utilisateurSchema = new Schema({
  nom:          { type: String, required: true, minlength: 1 },
  prenom:       { type: String, required: true, minlength: 1 },
  // Cosmos DB ne gère pas la collation : l'email est stocké en minuscules,
  // ce qui garantit l'unicité sans distinction de casse.
  email: {
    type: String, required: true, lowercase: true, trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  motDePasse:   { type: String, required: true, minlength: 1 }, // hachage produit par le backend
  dateCreation: { type: Date, required: true, default: Date.now },
  roles: {
    type: [{ type: String, enum: ['APPRENANT', 'FORMATEUR', 'AGENT'] }],
    validate: [
      auMoins(1),
      { validator: (r) => new Set(r).size === r.length, message: 'rôles en double' }
    ]
  },
  biographie:       String,
  domaineExpertise: String
}, options('Utilisateur'));

utilisateurSchema.index({ email: 1 }, { unique: true });
utilisateurSchema.index({ roles: 1 });

module.exports = model('Utilisateur', utilisateurSchema);
