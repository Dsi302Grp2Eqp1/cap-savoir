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

## Base de données locale persistante

La base `capsavoir` est initialisée sur le serveur MongoDB installé comme service Windows, à l'adresse `mongodb://127.0.0.1:27017/capsavoir`. Ses sept collections et leurs index sont créés avec le script `npm.cmd run db:init` déjà présent dans le dépôt. Ce script ajoute les collections absentes sans supprimer les documents existants.

Les données sont conservées dans le répertoire configuré par le service Windows MongoDB. Aucune instance temporaire ni aucun dossier de données MongoDB n'est créé dans le projet. Compass se connecte au même serveur avec `mongodb://127.0.0.1:27017` pour consulter la base.

Le fichier local `.env`, exclu de Git, contient la connexion et l'identifiant du profil formateur. Le fichier `.env.example` conserve des valeurs vides à adapter pour chaque machine :

1. `MONGODB_URI` désigne la base `capsavoir` du service MongoDB.
2. `FORMATEUR_ID` contient le `_id` du document `Utilisateur` ayant le rôle `FORMATEUR`.
3. Le profil local « Formateur CapSavoir » (`formateur.local@capsavoir.test`) permet d'utiliser l'espace formateur. Son mot de passe est un hachage d'une valeur aléatoire non conservée ; ce profil n'a pas de connexion utilisateur utilisable.

Aucun JWT ni écran de connexion n'est ajouté. En attendant US02/US03, toutes les routes du module utilisent le même profil défini côté serveur par `FORMATEUR_ID`. Ce contexte ne constitue pas une authentification : l'espace n'est pas destiné à être exposé publiquement avant intégration des droits utilisateurs.

L'espace formateur enregistre les formations, chapitres et références de ressources dans MongoDB. Les fichiers téléversés restent dans le dossier `uploads` décrit plus bas. La liste des formations est initialement vide ; aucune formation de démonstration n'a été ajoutée lors de la configuration de la base.

## Lancement

Avec Node 24 et les dépendances installées :

Si le service MongoDB est arrêté, le démarrer depuis PowerShell ouvert en tant qu'administrateur :

```powershell
net start MongoDB
```

Puis lancer le backend dans un terminal normal :

```powershell
cd C:\CapSavoirNodeProject\codeBack\backend
npm.cmd ci
npm.cmd run dev
```

Dans un autre terminal :

```powershell
cd C:\CapSavoirNodeProject\codeFront\frontend
npm.cmd ci
npm.cmd start
```

Ouvrir `http://127.0.0.1:4200/formateur`. `/health` vérifie l'API ; `http://localhost:3000/health/db` doit retourner `ok: true` et `collections: 7` lorsque MongoDB est connecté et initialisé.

## API

Toutes les routes vérifient le profil configuré. Les routes de formation limitent l'accès aux documents appartenant à ce profil. Le titre, les catégories, le prix, les identifiants et les références de fichiers sont validés côté serveur. Le statut et le propriétaire d'une nouvelle formation sont toujours définis par le serveur.

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

Les tests HTTP utilisent les modèles Mongoose et une persistance simulée en mémoire. Ils ne démarrent pas MongoDB et ne créent aucune base. Les fichiers de test sont temporaires et supprimés à la fin. Les tests Angular remplacent le service HTTP par des réponses contrôlées. Sur le service MongoDB local, la connexion aux sept collections et la lecture de la liste des formations ont également été vérifiées via l'API.
