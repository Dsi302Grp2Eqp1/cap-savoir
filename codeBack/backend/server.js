require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Mongo connected'))
  .catch(err => console.error('Mongo error', err));

// Azure sets PORT itself. Never hardcode it.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Listening on', PORT));
