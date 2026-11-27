const express = require('express');
const cors = require('cors');
const { etatBase } = require('./db');

const app = express();

app.use(cors({
  origin: [
    'https://dsi302grp2eqp1.github.io',
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/
  ],
  credentials: true
}));
// Webhook Stripe (US18). DOIT rester AVANT express.json() : Stripe signe le corps
// brut de la requête, et express.json() le transforme et casse la vérification.
app.post('/api/paiements/webhook', express.raw({ type: 'application/json' }),
  require('./controllers/paiements').webhook);
app.use(express.json());

// Used by the pipeline smoke test. Must stay public and return 200.
app.get('/health', (req, res) => res.sendStatus(200));

// Database check: 200 only if the API is connected and the 7 collections exist.
// Returns 503 otherwise (no connection, wrong MONGODB_URI, db:init not run).
app.get('/health/db', async (req, res) => {
  try {
    const etat = await etatBase();
    res.status(etat.ok ? 200 : 503).json(etat);
  } catch (err) {
    console.error('health/db', err.message);
    res.status(503).json({ ok: false, erreur: 'base inaccessible' });
  }
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/formations', require('./routes/formations'));
app.use('/api/catalogue', require('./routes/catalogue')); // US16
app.use('/api/inscriptions', require('./routes/inscriptions')); // US17
app.use('/api/modifications', require('./routes/modifications')); // US13
app.use('/api/fichiers', require('./routes/fichiers'));
app.use('/api/paiements', require('./routes/paiements')); // US18
app.use('/api/contenu', require('./routes/contenu'));     // US19
app.use('/api/agent/modifications', require('./routes/modifications-agent')); // US14
app.use('/api/agent', require('./routes/validation'));    // US39, US40, US12
// P4 : Quiz (US22, US23, US24)
app.use('/api', require('./routes/quiz'));

app.use((req, res) => res.status(404).json({ erreur: 'Route introuvable.' }));
app.use(require('./middlewares/erreurs'));
module.exports = app;