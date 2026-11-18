// Hachage des mots de passe (US01). bcryptjs : pur JavaScript, sans compilation native.
const bcrypt = require('bcryptjs');

const COUT = 10;
const LONGUEUR_MIN = 8;
const LONGUEUR_MAX = 72; // limite de bcrypt

// Hachage factice : permet un temps de réponse identique quand l'email
// n'existe pas, pour ne pas révéler quels comptes existent (US02).
const HACHAGE_FACTICE = bcrypt.hashSync('capsavoir-hachage-factice', COUT);

function estValide(motDePasse) {
  return (
    typeof motDePasse === 'string' &&
    motDePasse.length >= LONGUEUR_MIN &&
    Buffer.byteLength(motDePasse, 'utf8') <= LONGUEUR_MAX &&
    /[A-Za-z]/.test(motDePasse) &&
    /\d/.test(motDePasse)
  );
}

function hacher(motDePasse) {
  return bcrypt.hash(motDePasse, COUT);
}

function comparer(motDePasse, hachage) {
  return bcrypt.compare(String(motDePasse ?? ''), hachage || HACHAGE_FACTICE);
}

module.exports = { estValide, hacher, comparer, LONGUEUR_MIN };
