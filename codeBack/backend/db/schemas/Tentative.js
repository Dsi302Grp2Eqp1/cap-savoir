// Les réponses sont imbriquées ; le backend calcule le score et la validité.
CAP.creer("Tentative", {
  bsonType: "object",
  required: ["apprenantId", "quizId", "numeroTentative", "dateDebut", "reponses"],
  properties: {
    _id:             { bsonType: "objectId" },
    apprenantId:     { bsonType: "objectId" },
    quizId:          { bsonType: "objectId" },
    numeroTentative: { bsonType: "number", minimum: 1, multipleOf: 1 },
    dateDebut:       { bsonType: "date" },
    dateFin:         { bsonType: ["date", "null"] },
    score:           { bsonType: "number", minimum: 0, maximum: 100 },
    valide:          { bsonType: "bool" },
    reponses: {
      bsonType: "array",
      description: "peut être vide pendant une tentative en cours",
      items: {
        bsonType: "object",
        required: ["_id", "questionId", "propositionId", "estCorrecte", "pointsObtenus"],
        properties: {
          _id:           { bsonType: "objectId" },
          questionId:    { bsonType: "objectId" },
          propositionId: { bsonType: "objectId" },
          estCorrecte:   { bsonType: "bool" },
          pointsObtenus: { bsonType: "number", minimum: 0 }
        }
      }
    }
  }
});
db.Tentative.createIndex({ apprenantId: 1, quizId: 1, numeroTentative: 1 }, { unique: true });
db.Tentative.createIndex({ apprenantId: 1, dateDebut: -1 });
db.Tentative.createIndex({ quizId: 1, valide: 1 });
