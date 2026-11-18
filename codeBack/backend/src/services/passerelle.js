// Adaptateur de passerelle de paiement.
// MOCK TEMPORAIRE : état en mémoire, perdu au redémarrage.
// À remplacer par Konnect/Flouci : seules ces 3 fonctions doivent changer.
const sessions = new Map();

async function creerSession({ reference, montant }) {
  sessions.set(reference, { montant, statut: 'EN_ATTENTE' });
  const base = process.env.API_URL || 'http://localhost:3000';
  return { reference, moyen: 'CARTE', url: `${base}/api/paiements/mock/${reference}` };
}

// Vérification serveur à serveur : on ne croit jamais le corps du webhook.
async function verifier(reference) {
  return sessions.get(reference) ?? null; // { montant, statut }
}

// Mock uniquement : simule la décision de l'apprenant sur la page de la passerelle.
function simuler(reference, statut) {
  const session = sessions.get(reference);
  if (!session) return false;
  session.statut = statut; // 'CONFIRME' ou 'ECHOUE' (échec ou annulation)
  return true;
}

module.exports = { creerSession, verifier, simuler };