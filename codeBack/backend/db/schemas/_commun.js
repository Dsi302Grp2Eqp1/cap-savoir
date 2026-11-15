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

// Crée une collection ou met à jour son validateur sans supprimer les données.
CAP.creer = function (nom, schema) {
  const options = {
    validator: { $jsonSchema: schema },
    validationLevel: "strict",
    validationAction: "error"
  };
  if (db.getCollectionInfos({ name: nom }).length === 0) {
    db.createCollection(nom, options);
    print("collection créée : " + nom);
  } else {
    const resultat = db.runCommand({ collMod: nom, ...options });
    if (!resultat.ok) throw new Error("Validateur non mis à jour : " + nom);
    print("validateur mis à jour : " + nom);
  }
};

