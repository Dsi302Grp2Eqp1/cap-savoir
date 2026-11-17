// Express app definition (no DB connection, no listen) so tests can import it.
const express = require('express');
const cors = require('cors');
const { etatBase } = require('./db');

const app = express();

// Origin is the domain only, without the /cap-savoir path.
app.use(cors({
  origin: ['https://dsi302grp2eqp1.github.io', 'http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true
}));
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

app.use('/api/formations', require('./routes/formations'));
app.use('/api/fichiers', require('./routes/fichiers'));
app.use((req, res) => res.status(404).json({ erreur: 'Route introuvable.' }));
app.use(require('./middlewares/erreurs'));

module.exports = app;
