// Le backend vérifie les conditions avant délivrance et génère le PDF/code QR.
CAP.creer("Certificat", {
  bsonType: "object",
  required: ["apprenantId", "formationId", "identifiantUnique", "dateDelivrance", "codeQR"],
  properties: {
    _id:               { bsonType: "objectId" },
    apprenantId:       { bsonType: "objectId" },
    formationId:       { bsonType: "objectId" },
    identifiantUnique: { bsonType: "string", minLength: 1 },
    dateDelivrance:    { bsonType: "date" },
    codeQR:            { bsonType: "string", minLength: 1, description: "contenu ou URL de vérification du QR" },
    document:          CAP.fichier
  }
});
db.Certificat.createIndex({ identifiantUnique: 1 }, { unique: true });
db.Certificat.createIndex({ apprenantId: 1, formationId: 1 }, { unique: true });
db.Certificat.createIndex({ formationId: 1, dateDelivrance: -1 });
