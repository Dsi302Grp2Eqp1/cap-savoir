# Authentification et rôles : US01 US02 US03

Le module gère la création de compte, la connexion, la déconnexion et l'accès aux espaces selon le rôle (apprenant, formateur, agent).

## Fonctionnalités

- US01 : inscription (nom, prénom, email, mot de passe). Email unique sans distinction de casse, mot de passe haché avec bcrypt, date de création automatique. Tout nouveau compte a le rôle `APPRENANT`.
- US02 : connexion par email et mot de passe. En cas d'erreur, le message est identique que l'email ou le mot de passe soit faux. La session est un jeton JWT valable 2 h par défaut. La déconnexion invalide le jeton côté serveur.
- US03 : un espace par rôle (`/apprenant`, `/formateur`, `/agent`). Après connexion, l'utilisateur arrive dans son espace ; le menu n'affiche que ses espaces. L'API répond `403` si un utilisateur accède à une route d'un autre rôle.

## Organisation du code

```text
codeBack/backend/
  src/routes/auth.js                    chemins /api/auth/*
  src/controllers/auth.js               lecture de la requête et réponse HTTP
  src/services/auth.js                  règles métier : inscription, connexion, déconnexion
  src/middlewares/authentification.js   authentifier et exigerRole (à réutiliser par toute l'équipe)
  src/utils/jeton.js                    création et vérification des JWT
  src/utils/mot-de-passe.js             règles et hachage des mots de passe
  scripts/creer-utilisateur.js          création du premier agent ou ajout d'un rôle
  test/auth.test.js                     tests HTTP sans base de données

codeFront/frontend/src/app/
  core/auth/auth.service.ts       session (connexion, déconnexion, restauration au démarrage)
  core/auth/auth.interceptor.ts   ajoute le jeton aux appels API ; 401 → retour à la connexion
  core/auth/auth.guards.ts        roleGuard (espaces) et visiteurGuard (connexion/inscription)
  core/auth/espaces.ts            espaces par rôle et règle du mot de passe
  features/auth/connexion/        page de connexion
  features/auth/inscription/      page d'inscription
  features/auth/styles/auth.css   styles limités à ces pages
  features/espaces/               espaces apprenant et agent (à compléter par les US suivantes)
```

## API

| Méthode | Chemin | Accès | Fonction |
| --- | --- | --- | --- |
| POST | `/api/auth/inscription` | public | Créer un compte apprenant → `201` profil, `409` email déjà utilisé, `400` champ invalide |
| POST | `/api/auth/connexion` | public | `{ email, motDePasse }` → `{ jeton, utilisateur }`, `401` identifiants invalides |
| POST | `/api/auth/deconnexion` | connecté | Invalide toutes les sessions de l'utilisateur → `204` |
| GET | `/api/auth/moi` | connecté | Profil et rôles à jour |

Le jeton est envoyé dans l'en-tête `Authorization: Bearer <jeton>`. Le frontend l'ajoute automatiquement (intercepteur). Un cookie n'est pas utilisé car le frontend (`github.io`) et l'API (`azurewebsites.net`) sont sur deux domaines différents.

Mot de passe : au moins 8 caractères, avec au moins une lettre et un chiffre (72 octets maximum, limite de bcrypt).

## Protéger une route (pour toute l'équipe)

```js
const { authentifier, exigerRole } = require('../middlewares/authentification');

router.use(authentifier, exigerRole('AGENT'));        // tout le routeur réservé aux agents
router.get('/moi', authentifier, controller.moi);      // une route pour tout utilisateur connecté
```

Après `authentifier`, `req.utilisateur` contient `_id`, `nom`, `prenom`, `email`, `roles`, `dateCreation`. Les rôles sont relus en base à chaque requête : un rôle attribué par un agent (US38) s'applique sans reconnexion.

Côté Angular, une route se protège avec `canActivate: [roleGuard('FORMATEUR')]`. Le garde évite d'afficher la page ; la sécurité réelle reste le contrôle `403` de l'API.

### Espace formateur (P2)

`/formateur` est réservé au rôle `FORMATEUR` côté Angular. Les routes `/api/formations` et `/api/fichiers` utilisent encore le profil fixe `FORMATEUR_ID`. Pour les rattacher au formateur connecté, remplacer dans `routes/formations.js` et `routes/fichiers.js` :

```js
const { formateur } = require('../middlewares/contexte-formateur');
router.use(formateur);
```

par :

```js
const { authentifier, exigerRole } = require('../middlewares/authentification');
router.use(authentifier, exigerRole('FORMATEUR'));
```

Ce changement est à faire par P2, en accord avec l'équipe, dans une PR séparée.

## Configuration

`.env` (local) et variables d'environnement Azure (production) :

| Variable | Valeur |
| --- | --- |
| `JWT_SECRET` | Longue chaîne aléatoire : `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Sans elle, la connexion répond `503`. Ne jamais la partager ni la committer. |
| `JWT_DUREE` | Facultatif, défaut `2h` |

Changer `JWT_SECRET` déconnecte tous les utilisateurs.

## Créer le premier agent

Aucune user story ne crée de compte agent. Depuis `codeBack/backend`, avec `MONGODB_URI` dans `.env` :

```powershell
npm run utilisateur:creer -- --email agent@capsavoir.tn --nom Agent --prenom Principal --roles AGENT
```

Un mot de passe aléatoire est affiché une seule fois : le transmettre en privé. Pour un compte existant, la commande ajoute les rôles sans changer le mot de passe (par exemple `--roles FORMATEUR` pour tester l'espace formateur avant US38).

## Vérifications

```powershell
cd codeBack/backend
npm test
cd ../../codeFront/frontend
npx ng test --watch=false
npx ng build
```

Les tests backend simulent la base en mémoire. Les tests Angular simulent les réponses HTTP.
