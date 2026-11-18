// Crée un compte avec des rôles donnés, ou ajoute ces rôles à un compte existant.
// Sert à créer le premier AGENT, qu'aucune user story ne permet de créer.
//
//   npm run utilisateur:creer -- --email agent@capsavoir.tn --nom Agent --prenom Principal --roles AGENT
//
// Un mot de passe aléatoire est généré et affiché une seule fois : le transmettre en privé.
// Pour un compte existant, le mot de passe n'est pas modifié.
require('dotenv').config({ quiet: true });
const { parseArgs } = require('node:util');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const { connecter } = require('../src/db');
const { Utilisateur } = require('../src/models');
const { ROLES } = require('../src/middlewares/authentification');
const motDePasse = require('../src/utils/mot-de-passe');

function lireArguments() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      nom: { type: 'string' },
      prenom: { type: 'string' },
      roles: { type: 'string', default: 'APPRENANT' },
    },
  });
  const roles = values.roles.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean);
  const inconnus = roles.filter((r) => !ROLES.includes(r));
  if (!values.email || inconnus.length) {
    throw new Error(
      `Usage : --email <email> [--nom <nom>] [--prenom <prénom>] --roles ${ROLES.join(',')}` +
        (inconnus.length ? `\nRôle(s) inconnu(s) : ${inconnus.join(', ')}` : ''),
    );
  }
  return { ...values, email: values.email.trim().toLowerCase(), roles };
}

(async () => {
  try {
    const args = lireArguments();
    await connecter();

    const existant = await Utilisateur.findOne({ email: args.email });
    if (existant) {
      await Utilisateur.updateOne({ _id: existant._id }, { $addToSet: { roles: { $each: args.roles } } });
      const misAJour = await Utilisateur.findById(existant._id).select('roles');
      console.log(`Compte existant ${args.email} : rôles = ${misAJour.roles.join(', ')} (mot de passe inchangé)`);
    } else {
      if (!args.nom || !args.prenom) throw new Error('--nom et --prenom sont obligatoires pour un nouveau compte.');
      // 4 caractères garantis (lettre + chiffre) suivis d'une partie aléatoire.
      const genere = `Cs${randomBytes(2).readUInt16BE() % 10}${randomBytes(9).toString('base64url')}`;
      await Utilisateur.create({
        nom: args.nom,
        prenom: args.prenom,
        email: args.email,
        motDePasse: await motDePasse.hacher(genere),
        roles: args.roles,
        dateCreation: new Date(),
      });
      console.log(`Compte créé : ${args.email} (${args.roles.join(', ')})`);
      console.log(`Mot de passe (affiché une seule fois) : ${genere}`);
    }
    process.exitCode = 0;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
