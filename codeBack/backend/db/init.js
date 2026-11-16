// CapSavoir — création de la base MongoDB (MongoDB Atlas)
// À lancer depuis la racine du dépôt :
//   mongosh "<chaîne de connexion>" --file codeBack/backend/db/init.js
// Les chemins sont résolus depuis ce fichier, quel que soit le dossier courant.
// CAPSAVOIR_DB_NAME permet de cibler une base de test (défaut : capsavoir).

{
const chemin = require("path");
const fs = require("fs");
const fichiers = ["_commun", "Formation", "Quiz", "Demande", "Utilisateur", "Inscription", "Tentative", "Certificat"]
  .map(nom => chemin.join(__dirname, "schemas", nom + ".js"));

// Vérifie tous les fichiers avant la première modification de la base.
for (const fichier of fichiers) {
  if (!fs.existsSync(fichier)) throw new Error("Fichier de schéma absent : " + fichier);
}

db = db.getSiblingDB(process.env.CAPSAVOIR_DB_NAME || "capsavoir");
for (const fichier of fichiers) load(fichier);

print("Base " + db.getName() + " prête : " + db.getCollectionNames().join(", "));
}

