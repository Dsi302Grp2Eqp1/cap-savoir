// Test d'intégration mongosh : crée puis supprime uniquement une base temporaire.
{
const cheminTest = require("path");
const nomTest = "capsavoir_test_" + process.pid + "_" + Date.now();
const ancienneBase = process.env.CAPSAVOIR_DB_NAME;
const ancienneConnexion = db;
let nombreTests = 0;
const verifier = (condition, message) => {
  if (!condition) throw new Error(message);
  nombreTests++;
};
const rejeter = (action, code, message) => {
  let erreur;
  try { action(); } catch (e) { erreur = e; }
  verifier(erreur && erreur.code === code, message + " (code attendu : " + code + ")");
};
const copier = (document) => {
  return EJSON.parse(EJSON.stringify(document, { relaxed: false }));
};
const baseTest = db.getSiblingDB(nomTest);
if (baseTest.getCollectionNames().length !== 0) throw new Error("La base de test existe déjà");
process.env.CAPSAVOIR_DB_NAME = nomTest;
try {
  load(cheminTest.join(__dirname, "..", "init.js"));
  const collections = ["Utilisateur", "Formation", "Quiz", "Demande", "Inscription", "Tentative", "Certificat"];
  verifier(db.getCollectionNames().sort().join() === collections.slice().sort().join(), "Sept collections attendues");
  for (const nom of collections) {
    const info = db.getCollectionInfos({ name: nom })[0];
    verifier(info.options.validationLevel === "strict" && info.options.validationAction === "error", "Validation stricte : " + nom);
    verifier(db.getCollection(nom).getIndexes().length > 1, "Index métier : " + nom);
  }
  const maintenant = new Date();
  const apprenant = ObjectId(), formateur = ObjectId(), formation = ObjectId(), chapitre = ObjectId();
  const quiz = ObjectId(), question = ObjectId(), proposition = ObjectId();
  const fichier = { nom: "image.png", format: "image/png", taille: 10, url: "https://example.test/image.png" };
  const documents = {
    Utilisateur: {
      _id: apprenant, nom: "Test", prenom: "Apprenant", email: "eleve@example.test",
      motDePasse: "hachage-fictif-uniquement-pour-test", dateCreation: maintenant, roles: ["APPRENANT"]
    },
    Formation: {
      _id: formation, titre: "MongoDB", description: "Formation de test", categories: ["BDD"],
      prix: 20, image: fichier, statut: "PUBLIEE", dateCreation: maintenant,
      formateur: { _id: formateur, nom: "Test", prenom: "Formateur" },
      chapitres: [{ _id: chapitre, titre: "Introduction", ordre: 1, quizId: quiz, ressources: [] }]
    },
    Quiz: {
      _id: quiz, formationId: formation, chapitreId: chapitre, titre: "Quiz", scoreMinimum: 70,
      questions: [{ _id: question, enonce: "Une question", points: 1, propositions: [
        { _id: proposition, texte: "Vrai", estCorrecte: true },
        { _id: ObjectId(), texte: "Faux", estCorrecte: false }
      ] }]
    },
    Demande: {
      _id: ObjectId(), type: "FORMATEUR", demandeur: { _id: apprenant, nom: "Test", prenom: "Apprenant" },
      dateSoumission: maintenant, statut: "EN_ATTENTE", cv: fichier, experience: "Deux ans", domaineExpertise: "BDD"
    },
    Inscription: {
      _id: ObjectId(), apprenantId: apprenant, formationId: formation, dateInscription: maintenant, statut: "ACTIVE",
      paiements: [{ _id: ObjectId(), montant: 20, moyen: "CARTE", datePaiement: maintenant, referenceTransaction: "TX-TEST", statut: "CONFIRME" }],
      chapitresConsultes: [{ chapitreId: chapitre, dateDerniereConsultation: maintenant, dateTerminaison: maintenant }]
    },
    Tentative: {
      _id: ObjectId(), apprenantId: apprenant, quizId: quiz, numeroTentative: 1, dateDebut: maintenant,
      dateFin: maintenant, score: 100, valide: true,
      reponses: [{ _id: ObjectId(), questionId: question, propositionId: proposition, estCorrecte: true, pointsObtenus: 1 }]
    },
    Certificat: {
      _id: ObjectId(), apprenantId: apprenant, formationId: formation, identifiantUnique: "CERT-TEST",
      dateDelivrance: maintenant, codeQR: "https://example.test/certificats/CERT-TEST", document: fichier
    }
  };
  db.Utilisateur.insertOne({ ...documents.Utilisateur, _id: formateur, email: "formateur@example.test", roles: ["APPRENANT", "FORMATEUR"] });
  for (const nom of collections) verifier(db.getCollection(nom).insertOne(copier(documents[nom])).acknowledged, "Document valide : " + nom);
  const invalide = (nom, modifier, message) => {
    const document = copier(documents[nom]);
    document._id = ObjectId();
    modifier(document);
    rejeter(() => db.getCollection(nom).insertOne(document), 121, message);
  };
  invalide("Utilisateur", d => { delete d.email; }, "Email obligatoire");
  invalide("Utilisateur", d => { d.email = "invalide"; }, "Format email");
  invalide("Utilisateur", d => { d.roles = ["ADMIN_INCONNU"]; }, "Rôle invalide");
  invalide("Utilisateur", d => { d.roles = ["APPRENANT", "APPRENANT"]; }, "Rôles dupliqués");
  invalide("Formation", d => { d.prix = -1; }, "Prix négatif");
  invalide("Formation", d => { d.chapitres[0].ressources = [{ _id: ObjectId(), titre: "R", type: "INCONNU", contenu: fichier, ordre: 1 }]; }, "Type de ressource");
  invalide("Quiz", d => { d.scoreMinimum = 101; }, "Seuil hors intervalle");
  invalide("Quiz", d => { d.questions[0].propositions = []; }, "Propositions obligatoires");
  invalide("Demande", d => { delete d.cv; }, "CV obligatoire pour demande formateur");
  invalide("Demande", d => { d.type = "VALIDATION"; }, "Référence de formation obligatoire pour validation");
  invalide("Inscription", d => { d.apprenantId = "mauvais-type"; }, "Référence ObjectId");
  invalide("Inscription", d => { d.statut = "INCONNU"; }, "Statut inscription");
  invalide("Inscription", d => { d.paiements[0].montant = -1; }, "Montant négatif");
  invalide("Inscription", d => { d.chapitresConsultes[0].dateDerniereConsultation = "2026-01-01"; }, "Date de progression");
  invalide("Tentative", d => { d.numeroTentative = 1.5; }, "Numéro entier");
  invalide("Tentative", d => { d.score = 101; }, "Score hors intervalle");
  invalide("Tentative", d => { d.reponses[0].pointsObtenus = -1; }, "Points négatifs");
  invalide("Certificat", d => { d.codeQR = ""; }, "QR vide");
  invalide("Certificat", d => { d.document.taille = -1; }, "Sous-document Fichier commun");
  for (const nom of ["Utilisateur", "Inscription", "Tentative", "Certificat", "Quiz", "Demande"]) {
    const document = copier(documents[nom]);
    document._id = ObjectId();
    rejeter(() => db.getCollection(nom).insertOne(document), 11000, "Unicité : " + nom);
  }
  const emailCasse = { ...documents.Utilisateur, _id: ObjectId(), email: "ELEVE@example.test" };
  rejeter(() => db.Utilisateur.insertOne(emailCasse), 11000, "Email unique sans distinction de casse");
  const demandeValidation = {
    type: "VALIDATION", demandeur: documents.Demande.demandeur, dateSoumission: maintenant,
    statut: "EN_ATTENTE", formationId: formation, typeValidation: "NOUVELLE_FORMATION"
  };
  verifier(db.Demande.insertOne(demandeValidation).acknowledged, "Demande de validation valide");
  verifier(db.Tentative.insertOne({ apprenantId: apprenant, quizId: quiz, numeroTentative: 2, dateDebut: maintenant, reponses: [] }).acknowledged, "Tentative en cours");
  const comptes = collections.map(nom => db.getCollection(nom).countDocuments({}));
  load(cheminTest.join(__dirname, "..", "init.js"));
  for (let i = 0; i < collections.length; i++) {
    verifier(db.getCollection(collections[i]).countDocuments({}) === comptes[i], "Relance sans perte : " + collections[i]);
  }
  print("SUCCÈS : " + nombreTests + " vérifications sur " + nomTest);
} finally {
  baseTest.dropDatabase();
  if (ancienneBase === undefined) delete process.env.CAPSAVOIR_DB_NAME;
  else process.env.CAPSAVOIR_DB_NAME = ancienneBase;
  db = ancienneConnexion;
}
}
