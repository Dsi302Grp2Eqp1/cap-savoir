# Espace formateur US08 US09 US10

Le module permet de créer une formation en brouillon, de structurer ses chapitres et d'y ajouter des ressources.

## Fonctionnalités

- US08 : titre, description, catégories, prix en TND (0 autorisé), image de couverture téléversée.
- US09 : ajout, modification, suppression et changement d'ordre des chapitres.
- US10 : ajout, téléchargement, suppression et changement d'ordre des ressources d'un chapitre. Six types : vidéo, PDF, document, texte, image, présentation.

Les formations sont créées en `BROUILLON`. Les autres statuts sont consultables mais non modifiables par ces routes. La soumission, la validation et la publication appartiennent aux US suivantes.

## Organisation du code

```text
codeBack/backend/src/
  routes/          chemins HTTP et middleware de téléversement
  controllers/     lecture de la requête et réponse HTTP
  services/        règles métier, persistance et stockage des fichiers
  models/          schémas Mongoose déjà présents dans le dépôt
  middlewares/     contexte formateur temporaire et gestion des erreurs
  utils/           classe ErreurApi

codeFront/frontend/src/app/features/formateur/
  espace-formateur/        composant principal et orchestration des actions
  formations/
    liste-formations/      liste et sélection d'une formation
    formation-formulaire/  création d'une formation
    formation-resume/      informations et couverture d'une formation
    models/                Formation et contrats du formulaire
    services/              appels API concernant les formations
  chapitres/
    chapitre-editeur/      modification et ordre d'un chapitre
    chapitre-formulaire/   ajout d'un chapitre
    models/                Chapitre et son brouillon
    services/              appels API concernant les chapitres
  ressources/
    ressources-chapitre/   liste, ajout et ordre des ressources
    models/                Ressource et son brouillon
    services/              appels API concernant les ressources
    ressource.config.ts    types, libellés et formats acceptés
  shared/
    models/                métadonnées d'un fichier
    services/              téléversement et téléchargement des fichiers
  styles/                  styles communs limités à l'espace formateur
```

Chaque composant possède ses fichiers TypeScript, HTML et CSS. Le composant principal transmet les données aux composants enfants avec `@Input` et reçoit leurs actions avec `@Output`. Les appels HTTP passent par les services de chaque fonctionnalité, puis par `ApiService`. Les styles communs sont chargés une seule fois et limités aux descendants de `app-espace-formateur`.

Le modèle existant conserve les chapitres et ressources imbriqués dans `Formation`. Le type `DOCUMENT`, requis par US10, est ajouté aux deux définitions de schéma (Mongoose et script mongosh). Aucun fichier du dépôt d'origine n'est supprimé.

### Lire le backend

Chaque action a une fonction portant le même nom dans le contrôleur et le service : `ajouterChapitre`, `modifierChapitre`, `supprimerChapitre`, `ajouterRessource`, etc. Par exemple, `POST /api/formations/:id/chapitres` appelle `controller.ajouterChapitre`, puis `service.ajouterChapitre`.

Le contrôleur récupère les paramètres de la requête et envoie la réponse. Le service vérifie le brouillon et les données, ajoute le chapitre puis appelle `formation.save()`. Les petites fonctions communes vérifient les textes et identifiants ou retrouvent un sous-document. Les fonctions `enregistrer` et `retrouver` du service fichiers gèrent le stockage ; la détection du format et la validation UTF-8 sont isolées pour faciliter leur lecture. Les erreurs passent par `ErreurApi` et le middleware `erreurs.js`.

## Connexion à la base Azure Cosmos DB

La base utilisée pour le travail de l'équipe est désormais `capsavoir` sur Azure Cosmos DB, avec l'API MongoDB. Elle contient les sept collections : `Utilisateur`, `Formation`, `Quiz`, `Demande`, `Inscription`, `Tentative` et `Certificat`.

Le backend et Compass doivent se connecter à cette même base avec la chaîne MongoDB fournie par Azure. Les données de cette base sont stockées dans Cosmos DB. Le service MongoDB Windows n'a pas besoin d'être démarré pour utiliser Cosmos DB.

Le fichier local `codeBack/backend/.env`, exclu de Git, contient la connexion à la base et la clé des sessions. Pour une nouvelle machine, copier `.env.example` vers `.env` uniquement si ce dernier n'existe pas déjà, puis remplir :

1. `MONGODB_URI` : copier la chaîne de connexion Azure, avec le nom de base `capsavoir`. Conserver ses paramètres, notamment `ssl=true`, `replicaSet=globaldb` et `retrywrites=false`, ainsi que `maxIdleTimeMS` et `appName` s'ils sont fournis.
2. `JWT_SECRET` : clé de signature des sessions, voir [authentification US01 US02 US03](auth-us01-us02-us03.md).
3. `PORT` : conserver `3000` pour le frontend local existant.
4. `UPLOAD_DIR` : facultatif en local ; vide, il conserve les fichiers dans le dossier `uploads` du backend. Sur un serveur, choisir un dossier persistant.

La vraie URI contient des identifiants d'accès à la base : elle reste uniquement dans `.env` ou dans les variables d'environnement du serveur. `.env.example` contient des instructions et un exemple fictif, sans clé ni mot de passe réel. Modifier la base dans `.env` nécessite de redémarrer le backend pour recharger la configuration.

Les routes du module sont réservées aux utilisateurs connectés ayant le rôle `FORMATEUR` (US02/US03) : `401` sans session, `403` pour un autre rôle. Chaque formateur ne voit et ne modifie que ses propres formations et fichiers. Pour obtenir le rôle avant US38, voir « Créer le premier agent » dans le [guide d'authentification](auth-us01-us02-us03.md).

Le profil « Formateur Demonstration » (`formateur.test@capsavoir.test`) a un mot de passe haché à partir d'une valeur aléatoire non conservée : il ne permet pas de se connecter, et ses formations ne sont visibles par aucun autre formateur.

L'espace formateur enregistre les formations, chapitres et références de ressources dans Cosmos DB via Mongoose. Les fichiers téléversés restent dans le dossier `uploads` décrit plus bas. Une formation « Node.js et Angular - Formation de demonstration » a été créée depuis Angular et sa présence dans `capsavoir.Formation` a été vérifiée, avec le statut `BROUILLON`.

### Option MongoDB sur le PC

Pour travailler sur une base distincte installée sur le PC, utiliser `mongodb://127.0.0.1:27017/capsavoir` dans `.env`, puis créer un compte formateur dans cette base locale avec `npm run utilisateur:creer`. Le script `npm.cmd run db:init` crée les collections absentes et leurs index sans supprimer les documents existants. Il n'est pas nécessaire de l'exécuter pour la base Cosmos DB déjà initialisée de l'équipe.

## Lancement

Avec Node 24 et les dépendances installées :

Avec la connexion Cosmos DB, lancer directement le backend. La commande suivante concerne uniquement l'option MongoDB installée sur le PC, si son service est arrêté ; elle s'exécute depuis PowerShell ouvert en tant qu'administrateur :

```powershell
net start MongoDB
```

Puis lancer le backend dans un terminal normal :

```powershell
cd C:\CapSavoirNodeProject\codeBack\backend
npm.cmd ci
npm.cmd start
```

`npm.cmd start` lance le serveur sans redémarrages automatiques pendant les essais de téléversement. `npm.cmd run dev` reste disponible pour développer avec surveillance des fichiers.

Dans un autre terminal :

```powershell
cd C:\CapSavoirNodeProject\codeFront\frontend
npm.cmd ci
npm.cmd start
```

Ouvrir `http://127.0.0.1:4200/formateur`. `/health` vérifie l'API ; `http://localhost:3000/health/db` doit retourner `ok: true` et `collections: 7` lorsque MongoDB est connecté et initialisé.

## API

Toutes les routes exigent un formateur connecté (en-tête `Authorization: Bearer <jeton>`). Les routes de formation limitent l'accès aux documents appartenant à ce formateur. Le titre, les catégories, le prix, les identifiants et les références de fichiers sont validés côté serveur. Le statut et le propriétaire d'une nouvelle formation sont toujours définis par le serveur.

| Méthode | Chemin sous `/api` | Fonction |
| --- | --- | --- |
| GET | `/formations` | Les 100 dernières formations du profil |
| POST | `/formations` | Créer un brouillon |
| GET | `/formations/:id` | Consulter la formation et ses chapitres |
| POST | `/formations/:id/chapitres` | Ajouter un chapitre |
| PATCH / DELETE | `/formations/:id/chapitres/:chapitreId` | Modifier / supprimer un chapitre |
| PUT | `/formations/:id/chapitres/ordre` | Réordonner avec `{ "ids": [...] }` |
| POST | `/formations/:id/chapitres/:chapitreId/ressources` | Ajouter une ressource |
| PATCH / DELETE | `/formations/:id/chapitres/:chapitreId/ressources/:ressourceId` | Renommer / retirer une ressource |
| PUT | `/formations/:id/chapitres/:chapitreId/ressources/ordre` | Réordonner avec tous les identifiants |
| POST | `/fichiers?type=IMAGE` | Téléverser un fichier multipart dans le champ `fichier` |
| GET | `/fichiers/:formateurId/:fichierId` | Télécharger un fichier du profil |

Pour créer une formation, téléverser d'abord son image puis envoyer `{ titre, description, categories: ["Web"], prix: 0, image }`, où `image` est la réponse du téléversement. Pour une ressource, envoyer `{ titre, type, contenu }`, où `contenu` est la réponse du téléversement du fichier correspondant.

## Fichiers

Les binaires sont stockés dans `codeBack/backend/uploads`, exclu de Git. MongoDB garde uniquement les métadonnées et l'URL. `UPLOAD_DIR` permet de choisir un dossier persistant sur le serveur. Les noms physiques sont générés avec un UUID. Les métadonnées du client ne permettent pas de référencer un fichier d'un autre profil.

Chaque fichier est limité à 50 Mo et son format est détecté d'après son contenu avec file-type, indépendamment de l'extension déclarée. [Documentation file-type](https://github.com/sindresorhus/file-type). Les téléversements multipart sont traités par [Multer](https://expressjs.com/en/resources/middleware/multer/).

| Type | Formats acceptés |
| --- | --- |
| IMAGE | JPEG, PNG, WebP, GIF |
| VIDEO | MP4, WebM, MOV |
| PDF | PDF |
| DOCUMENT | DOCX, ODT, RTF |
| PRESENTATION | PPTX, ODP |
| TEXTE | Texte UTF-8 rédigé dans le formulaire, stocké en TXT |

Retirer une ressource supprime sa référence dans la formation. Le fichier physique est conservé pour éviter d'effacer un fichier encore utilisé ailleurs. Les téléversements abandonnés restent également sur disque ; leur nettoyage et un stockage partagé pour un déploiement sur plusieurs instances seront à traiter avec la configuration finale. Les mises à jour concurrentes d'une formation utilisent le contrôle de version Mongoose et répondent 409 en cas de conflit.

## Vérifications sans base

```powershell
cd C:\CapSavoirNodeProject\codeBack\backend
npm.cmd test
cd C:\CapSavoirNodeProject\codeFront\frontend
npm.cmd test -- --watch=false
npm.cmd run build
```

Les tests HTTP utilisent les modèles Mongoose et une persistance simulée en mémoire. Ils ne démarrent pas MongoDB et ne créent aucune base. Les fichiers de test sont temporaires et supprimés à la fin. Les tests Angular remplacent le service HTTP par des réponses contrôlées. Sur Cosmos DB, la connexion aux sept collections, la lecture des formations via l'API et la présence de la formation créée depuis Angular ont également été vérifiées.
