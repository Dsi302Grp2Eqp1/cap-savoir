require('dotenv').config();
const app = require('./src/app');
const { connecter } = require('./src/db');

// Une erreur de base est journalisée sans arrêter l'API (/health reste disponible,
// /health/db répond 503).
connecter().catch(err => console.error('Mongo error', err.message));

// Azure sets PORT itself. Never hardcode it.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Listening on', PORT));
