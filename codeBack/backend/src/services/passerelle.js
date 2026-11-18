// Adaptateur de passerelle de paiement : SEUL fichier qui connaît Stripe.
// Hors cours : SDK Stripe, mode test uniquement.
// Pour changer de passerelle, seules ces 3 fonctions sont à réécrire.
const Stripe = require('stripe');
const ErreurApi = require('../utils/erreur-api');

let client;
function stripe() { // création tardive : l'app et les tests démarrent sans clé
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new ErreurApi(503, 'Passerelle de paiement non configurée.');
  }
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

async function creerSession({ paiementId, montant, titre }) {
  const front = process.env.FRONT_URL || 'http://localhost:4200';
  const retour = `${front}/paiement/resultat?ref=${paiementId}`;
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: process.env.PAIEMENT_DEVISE || 'usd',
        unit_amount: Math.round(montant * 100), // plus petite unité
        product_data: { name: titre },
      },
    }],
    success_url: retour,
    cancel_url: retour,
  });
  return { reference: session.id, moyen: 'CARTE', url: session.url };
}

// Vérification serveur à serveur auprès de Stripe.
async function verifier(reference) {
  const session = await stripe().checkout.sessions.retrieve(reference);
  const statut = session.payment_status === 'paid' ? 'CONFIRME'
    : session.status === 'expired' ? 'ECHOUE' : 'EN_ATTENTE';
  return { montant: session.amount_total / 100, statut };
}

// Valide la signature du webhook (corps brut obligatoire).
// Retourne la référence concernée, ou null si l'événement est ignoré.
// Lève une erreur si la signature est invalide.
function lireEvenement(corpsBrut, signature) {
  const evenement = stripe().webhooks.constructEvent(
    corpsBrut, signature, process.env.STRIPE_WEBHOOK_SECRET);
  const utiles = ['checkout.session.completed', 'checkout.session.expired'];
  return utiles.includes(evenement.type) ? evenement.data.object.id : null;
}

module.exports = { creerSession, verifier, lireEvenement };