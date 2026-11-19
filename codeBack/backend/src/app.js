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
app.use(express.json());

app.get('/health', (req, res) => res.sendStatus(200));

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
app.use('/api/fichiers', require('./routes/fichiers'));
app.use('/api/agent', require('./routes/validation'));

app.use((req, res) => res.status(404).json({ erreur: 'Route introuvable.' }));
app.use(require('./middlewares/erreurs'));

module.exports = app;