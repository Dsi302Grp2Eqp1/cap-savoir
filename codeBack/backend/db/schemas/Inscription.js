// Inscription contient les paiements et le suivi des chapitres de l'apprenant.
CAP.creer("Inscription", {
  bsonType: "object",
  required: ["apprenantId", "formationId", "dateInscription", "statut", "paiements", "chapitresConsultes"],
  properties: {
    _id:             { bsonType: "objectId" },
    apprenantId:     { bsonType: "objectId" },
    formationId:     { bsonType: "objectId" },
    dateInscription: { bsonType: "date" },
    statut:          { enum: ["EN_ATTENTE_PAIEMENT", "ACTIVE", "ANNULEE"] },
    paiements: {
      bsonType: "array",
      items: {
        bsonType: "object",
        required: ["_id", "montant", "moyen", "statut"],
        properties: {
          _id:                 { bsonType: "objectId" },
          montant:             { bsonType: "number", minimum: 0 },
          datePaiement:        { bsonType: ["date", "null"] },
          moyen:               { bsonType: "string", minLength: 1 },
          referenceTransaction: { bsonType: "string", minLength: 1 },
          statut:              { enum: ["EN_ATTENTE", "CONFIRME", "ECHOUE"] }
        }
      }
    },
    chapitresConsultes: {
      bsonType: "array",
      items: {
        bsonType: "object",
        required: ["chapitreId", "dateDerniereConsultation"],
        properties: {
          chapitreId:               { bsonType: "objectId" },
          dateDerniereConsultation:  { bsonType: "date" },
          dateTerminaison:           { bsonType: ["date", "null"] }
        }
      }
    }
  }
});
// Une inscription par apprenant/formation ; une réactivation met à jour ce document.
db.Inscription.createIndex({ apprenantId: 1, formationId: 1 }, { unique: true });
db.Inscription.createIndex({ apprenantId: 1, statut: 1 });
db.Inscription.createIndex({ formationId: 1, statut: 1 });
db.Inscription.createIndex({ "paiements.referenceTransaction": 1 });
