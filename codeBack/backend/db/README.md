# Base MongoDB CapSavoir

Sept collections : `Utilisateur`, `Formation`, `Quiz`, `Demande`, `Inscription`, `Tentative`, `Certificat`.
Les scripts sont destinés à `mongosh`, avec MongoDB local ou Atlas. Compass se connecte au même serveur pour consulter et modifier les données.

## Initialiser la base

Depuis la racine du dépôt, avec `mongosh` installé et le serveur démarré :

```powershell
mongosh "mongodb://127.0.0.1:27017" --file codeBack/backend/db/init.js
```

Pour Atlas, remplacer l'URI locale par celle du cluster. Ne jamais enregistrer les identifiants dans Git.
Les chemins sont résolus depuis `init.js` : le chargement ne dépend pas du dossier courant.
La base par défaut est `capsavoir`. Pour cibler une autre base :

```powershell
$env:CAPSAVOIR_DB_NAME = "capsavoir_dev"
mongosh "mongodb://127.0.0.1:27017" --file codeBack/backend/db/init.js
Remove-Item Env:CAPSAVOIR_DB_NAME
```

Le script crée les collections absentes, met à jour les validateurs des collections existantes et ajoute les index.
Il ne supprime aucun document. Les documents existants ne sont pas automatiquement corrigés par `collMod` ; les nouvelles écritures sont validées strictement.
Si des doublons empêchent la création d'un index unique, l'exécution échoue : résoudre ces doublons puis relancer. L'initialisation n'est pas transactionnelle.

## Correspondance avec le diagramme

| Collection | Classes et informations |
| --- | --- |
| Utilisateur | Identité commune, rôles APPRENANT/FORMATEUR/AGENT, biographie et expertise du formateur |
| Formation | Formation avec chapitres et ressources imbriqués ; le catalogue est une requête |
| Quiz | Quiz avec questions et propositions ; `estCorrecte` distingue les propositions vraies/fausses |
| Demande | DemandeFormateur et DemandeValidation, distinguées par `type` |
| Inscription | Liens apprenant/formation, paiements et chapitres consultés imbriqués |
| Tentative | Lien apprenant/quiz et réponses de l'apprenant imbriquées |
| Certificat | Liens apprenant/formation, identifiant unique, QR et fichier PDF facultatif |

Les identifiants sont des `ObjectId` MongoDB, en remplacement des `id : int` du diagramme.
Les dates sont des valeurs BSON Date (`new Date()` dans mongosh), pas des chaînes.
`CAP.fichier` décrit les métadonnées et l'URL d'un fichier ; le binaire est stocké séparément.
Les liens des quatre nouvelles collections utilisent `apprenantId`, `formationId`, `quizId`, `chapitreId`, `questionId` et `propositionId` selon leur contexte.
Les résumés déjà définis par A (`formateur`, `demandeur`) restent inchangés.

## Choix à respecter dans le backend

- Un utilisateur peut cumuler plusieurs rôles. Le backend contrôle les autorisations et les informations nécessaires au profil formateur.
- `motDePasse` contient exclusivement un hachage calculé par le backend. Le validateur ne réalise pas le hachage.
- L'email est unique sans distinction de casse ; le backend le normalise et utilise la même collation pour les recherches concernées.
- Une seule inscription et un seul certificat sont autorisés par couple apprenant/formation. Réactiver une inscription met à jour son document.
- Les paiements sont un historique dans l'inscription. Le backend contrôle les références de transaction, les confirmations, les dates et le montant avant activation ; les formations gratuites suivent leur règle d'activation propre.
- Le backend garantit l'unicité des chapitres consultés, des réponses par question et des identifiants des sous-documents dans leurs tableaux.
- Une tentative en cours peut avoir `reponses: []` et ne pas encore avoir de score, de validité ou de date de fin. À la soumission, le backend vérifie les réponses et calcule ces valeurs côté serveur.
- Le backend contrôle l'existence et l'appartenance des références : apprenant inscrit, quiz du bon chapitre, proposition de la bonne question, chapitre de la bonne formation.
- Les règles métier restent applicatives : une bonne proposition par question, chapitre/quiz requis à la publication, score calculé, conditions de délivrance du certificat, génération PDF/QR, traitements des demandes et cohérence des dates.
- Les copies de nom/prénom dans les résumés de personnes nécessitent une politique de mise à jour.

Ces scripts créent le modèle de stockage. Ils n'implémentent pas les méthodes du diagramme (`sInscrire`, `calculerScore`, `genererPDF`, etc.) ni les routes de l'application.

## Tests d'intégration

```powershell
mongosh "mongodb://127.0.0.1:27017" --file codeBack/backend/db/tests/schemas.test.js
```

Le test crée une base dédiée `capsavoir_test_<processus>_<horodatage>`, vérifie les sept collections, les insertions, les rejets, les index uniques et la conservation des données après relance. Il supprime sa base temporaire à la fin et ne cible pas `capsavoir`.

## Consulter dans Compass

1. Se connecter au même serveur avec l'URI locale ou Atlas.
2. Rafraîchir les bases puis ouvrir `capsavoir` (ou le nom choisi).
3. Consulter les onglets Documents, Indexes et Validation des collections.

Une base initialisée est vide : les documents de test ne sont pas des données de production et sont supprimés avec la base de test.
