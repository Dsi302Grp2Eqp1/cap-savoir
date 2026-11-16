// Connexion MongoDB / Azure Cosmos DB et création des collections et index.
const mongoose = require('mongoose');
const models = require('./models');

// Collections et index sont créés explicitement par initialiserBase().
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

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

module.exports = { connecter, initialiserBase };
