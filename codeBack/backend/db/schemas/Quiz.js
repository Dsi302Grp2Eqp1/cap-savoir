// Collection Quiz — responsable : Personne A
// Chargé par db/init.js (utilise CAP.fichier, CAP.resumePersonne, CAP.creer de _commun.js)

// Quiz  (Quiz, Question, Proposition)
CAP.creer("Quiz", {
  bsonType: "object",
  required: ["formationId", "chapitreId", "titre", "scoreMinimum", "questions"],
  properties: {
    formationId:  { bsonType: "objectId" },
    chapitreId:   { bsonType: "objectId" },
    titre:        { bsonType: "string", minLength: 1 },
    scoreMinimum: { bsonType: "number", minimum: 0, maximum: 100, description: "en % (US22)" },
    questions: {
      bsonType: "array", minItems: 1,
      items: {
        bsonType: "object",
        required: ["_id", "enonce", "points", "propositions"],
        properties: {
          _id:         { bsonType: "objectId" },
          enonce:      { bsonType: "string", minLength: 1 },
          points:      { bsonType: "number", minimum: 0 },
          explication: { bsonType: "string", description: "affichée avec la correction (US25)" },
          propositions: {
            bsonType: "array", minItems: 2,
            description: "une seule estCorrecte = true (vérifié par l'application)",
            items: {
              bsonType: "object",
              required: ["_id", "texte", "estCorrecte"],
              properties: {
                _id:         { bsonType: "objectId" },
                texte:       { bsonType: "string", minLength: 1 },
                estCorrecte: { bsonType: "bool" }
              }
            }
          }
        }
      }
    }
  }
});
db.Quiz.createIndex({ chapitreId: 1 }, { unique: true });   // 1 quiz par chapitre
db.Quiz.createIndex({ formationId: 1 });
