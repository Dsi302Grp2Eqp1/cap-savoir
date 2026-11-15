// CapSavoir — création de la base MongoDB (MongoDB Atlas)
// À lancer depuis la racine du dépôt :
//   mongosh "<chaîne de connexion Atlas>" db/init.js

db = db.getSiblingDB("capsavoir");

load("db/schemas/_commun.js");

// Personne A
load("db/schemas/Formation.js");
load("db/schemas/Quiz.js");
load("db/schemas/Demande.js");

// Personne B
load("db/schemas/Utilisateur.js");
load("db/schemas/Inscription.js");
load("db/schemas/Tentative.js");
load("db/schemas/Certificat.js");

print("Base capsavoir prête : " + db.getCollectionNames().join(", "));
