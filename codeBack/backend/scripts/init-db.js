// Création manuelle de la base : npm run db:init
// Lit MONGODB_URI dans .env (ou l'environnement), crée les 7 collections et leurs index.
require('dotenv').config();
const mongoose = require('mongoose');
const { connecter, initialiserBase } = require('../src/db');

(async () => {
  try {
    await connecter();
    const erreurs = await initialiserBase();
    const noms = (await mongoose.connection.db.listCollections().toArray()).map(c => c.name).sort();
    console.log(`Base ${mongoose.connection.name} : ${noms.join(', ')}`);
    process.exitCode = erreurs.length ? 1 : 0;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
