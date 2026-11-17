// Collection Formation — responsable : Personne A
// Chargé par db/init.js (utilise CAP.fichier, CAP.resumePersonne, CAP.creer de _commun.js)

// Formation  (Formation, Chapitre, Ressource ; Catalogue = requête)
CAP.creer("Formation", {
  bsonType: "object",
  required: ["titre", "description", "categories", "prix", "image", "statut", "dateCreation", "formateur", "chapitres"],
  properties: {
    titre:        { bsonType: "string", minLength: 1 },
    description:  { bsonType: "string", minLength: 1 },
    categories:   { bsonType: "array", minItems: 1, items: { bsonType: "string" } },
    prix:         { bsonType: "number", minimum: 0 },
    image:        CAP.fichier,
    statut:       { enum: ["BROUILLON", "SOUMISE", "PUBLIEE", "ARCHIVEE"] },
    dateCreation: { bsonType: "date" },
    formateur:    CAP.resumePersonne,
    chapitres: {
      bsonType: "array",
      description: "vide en brouillon ; au moins 1 chapitre exigé à la soumission (code applicatif, US11)",
      items: {
        bsonType: "object",
        required: ["_id", "titre", "ordre", "ressources"],
        properties: {
          _id:         { bsonType: "objectId" },
          titre:       { bsonType: "string", minLength: 1 },
          description: { bsonType: "string" },
          ordre:       { bsonType: "number", minimum: 1 },
          quizId:      { bsonType: ["objectId", "null"] },
          ressources: {
            bsonType: "array",
            items: {
              bsonType: "object",
              required: ["_id", "titre", "type", "contenu", "ordre"],
              properties: {
                _id:     { bsonType: "objectId" },
                titre:   { bsonType: "string", minLength: 1 },
                type:    { enum: ["VIDEO", "PDF", "DOCUMENT", "TEXTE", "IMAGE", "PRESENTATION"] },  // US10
                contenu: CAP.fichier,
                ordre:   { bsonType: "number", minimum: 1 }
              }
            }
          }
        }
      }
    }
  }
});
db.Formation.createIndex({ statut: 1, categories: 1, prix: 1 });   // US16 catalogue + filtres
db.Formation.createIndex({ titre: "text", description: "text" }); // US16, US40 recherche par titre
db.Formation.createIndex({ "formateur._id": 1, statut: 1 });      // US15 tableau de bord formateur
