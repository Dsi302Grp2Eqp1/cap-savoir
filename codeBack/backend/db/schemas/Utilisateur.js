// Utilisateur, Apprenant, Formateur et Agent partagent cette collection.
// Le backend doit hacher motDePasse avant toute insertion (jamais de texte clair).
CAP.creer("Utilisateur", {
  bsonType: "object",
  required: ["nom", "prenom", "email", "motDePasse", "dateCreation", "roles"],
  properties: {
    _id:          { bsonType: "objectId" },
    nom:          { bsonType: "string", minLength: 1 },
    prenom:       { bsonType: "string", minLength: 1 },
    email:        { bsonType: "string", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
    motDePasse:   { bsonType: "string", minLength: 1, description: "hachage produit par le backend" },
    dateCreation: { bsonType: "date" },
    roles: {
      bsonType: "array", minItems: 1, uniqueItems: true,
      items: { enum: ["APPRENANT", "FORMATEUR", "AGENT"] }
    },
    biographie:       { bsonType: "string" },
    domaineExpertise: { bsonType: "string" }
  }
});
// L'unicité ne dépend pas de la casse. Le backend normalise aussi l'email.
db.Utilisateur.createIndex(
  { email: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
db.Utilisateur.createIndex({ roles: 1 });
