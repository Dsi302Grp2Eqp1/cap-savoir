// Express app definition (no DB connection, no listen) so tests can import it.
const express = require('express');
const cors = require('cors');

const app = express();

// Origin is the domain only, without the /cap-savoir path.
app.use(cors({
  origin: ['https://dsi302grp2eqp1.github.io', 'http://localhost:4200'],
  credentials: true
}));
app.use(express.json());

// Used by the pipeline smoke test. Must stay public and return 200.
app.get('/health', (req, res) => res.sendStatus(200));

// Mount feature routes here, e.g.:
// app.use('/api/formations', require('./routes/formations'));

module.exports = app;
