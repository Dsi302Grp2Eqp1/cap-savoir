// Éléments communs à toutes les collections — responsable : Personne A
// Chargé en premier par db/init.js. Les autres fichiers utilisent CAP.fichier, CAP.resumePersonne, CAP.creer.

globalThis.CAP = {};

// Sous-document réutilisé : Fichier (Image, Document, contenu d'une Ressource)
CAP.fichier = {
  bsonType: "object",
  required: ["nom", "format", "taille", "url"],
  properties: {
    nom:    { bsonType: "string", description: "nom du fichier" },
    format: { bsonType: "string", description: "extension ou type MIME" },
    taille: { bsonType: "number", minimum: 0, description: "taille en octets" },
    url:    { bsonType: "string", description: "emplacement du fichier (Blob Storage, dossier uploads...)" }
  }
};

// Résumé d'une personne copié dans un autre document (modèle hybride)
CAP.resumePersonne = {
  bsonType: "object",
  required: ["_id", "nom", "prenom"],
  properties: {
    _id:    { bsonType: "objectId" },
    nom:    { bsonType: "string" },
    prenom: { bsonType: "string" }
  }
};

// Crée (ou recrée) une collection avec son validateur $jsonSchema
CAP.creer = function (nom, schema) {
  db.getCollection(nom).drop();
  db.createCollection(nom, {
    validator: { $jsonSchema: schema },
    validationLevel: "strict",
    validationAction: "error"
  });
  print("collection créée : " + nom);
};
