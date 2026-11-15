// Collection Demande — responsable : Personne A
// Chargé par db/init.js (utilise CAP.fichier, CAP.resumePersonne, CAP.creer de _commun.js)

// Demande  (Demande, DemandeFormateur, DemandeValidation)
CAP.creer("Demande", {
  bsonType: "object",
  required: ["type", "demandeur", "dateSoumission", "statut"],
  properties: {
    type:           { enum: ["FORMATEUR", "VALIDATION"] },
    demandeur:      CAP.resumePersonne,
    dateSoumission: { bsonType: "date" },
    statut:         { enum: ["EN_ATTENTE", "ACCEPTEE", "REFUSEE"] },
    agentId:        { bsonType: ["objectId", "null"], description: "agent qui a traité la demande (0..1)" },
    dateDecision:   { bsonType: ["date", "null"] },
    commentaire:    { bsonType: ["string", "null"], description: "motif, obligatoire en cas de refus (code applicatif)" },
    // champs DemandeFormateur
    cv:               CAP.fichier,
    experience:       { bsonType: "string" },
    domaineExpertise: { bsonType: "string" },
    // champs DemandeValidation
    formationId:      { bsonType: "objectId" },
    typeValidation:   { enum: ["NOUVELLE_FORMATION", "MODIFICATION"] },
    contenuPropose:   { bsonType: "object", description: "version modifiée de la formation (MODIFICATION)" }
  },
  // champs obligatoires selon le type de demande
  oneOf: [
    { properties: { type: { enum: ["FORMATEUR"] } },
      required: ["cv", "experience", "domaineExpertise"] },
    { properties: { type: { enum: ["VALIDATION"] } },
      required: ["formationId", "typeValidation"] }
  ]
});
// US05 : une seule demande formateur EN_ATTENTE par utilisateur
db.Demande.createIndex(
  { "demandeur._id": 1, type: 1 },
  { unique: true, partialFilterExpression: { statut: "EN_ATTENTE", type: "FORMATEUR" } }
);
db.Demande.createIndex({ type: 1, statut: 1, dateSoumission: -1 }); // US06, US39
db.Demande.createIndex({ agentId: 1, dateDecision: -1 });            // US36 historique
