// Connexion MongoDB / Azure Cosmos DB et création des collections et index.
const mongoose = require('mongoose');

// Collections et index sont créés explicitement par initialiserBase() (npm run db:init).
// Réglé avant le chargement des modèles pour qu'aucune création implicite n'ait lieu.
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

const models = require('./models');

async function connecter(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI manquant');
  await mongoose.connect(uri);
  console.log('Mongo connected, base :', mongoose.connection.name);
}

// Crée les collections absentes puis leurs index. Ne supprime aucune donnée.
// Peut être relancé sans risque : les éléments existants sont ignorés.
async function initialiserBase() {
  const existantes = new Set(
    (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name)
  );
  const erreurs = [];
  for (const [nom, Model] of Object.entries(models)) {
    try {
      if (!existantes.has(nom)) {
        await Model.createCollection();
        console.log('collection créée :', nom);
      }
      await Model.createIndexes();
      console.log('index ok :', nom);
    } catch (err) {
      console.error(`Erreur sur ${nom} :`, err.message);
      erreurs.push(nom);
    }
  }
  return erreurs;
}

// État de la base pour /health/db : connexion active et les 7 collections présentes.
// Lecture seule : ne crée et ne modifie rien.
async function etatBase() {
  if (mongoose.connection.readyState !== 1) {
    return { ok: false, connecte: false };
  }
  const presentes = new Set(
    (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name)
  );
  const manquantes = Object.keys(models).filter(nom => !presentes.has(nom));
  return {
    ok: manquantes.length === 0,
    connecte: true,
    base: mongoose.connection.name,
    collections: Object.keys(models).length - manquantes.length,
    manquantes
  };
}

module.exports = { connecter, initialiserBase, etatBase };
