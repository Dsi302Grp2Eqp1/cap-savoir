import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { roleGuard, visiteurGuard } from './core/auth/auth.guards';
import { AuthService } from './core/auth/auth.service';

// US03 : chaque espace est réservé à son rôle ; l'accueil ouvre l'espace de l'utilisateur.
const versEspace = () => inject(AuthService).espaceParDefaut();

export const routes: Routes = [
  // US19 : contenu d'une formation payée (accès vérifié par le serveur).
  {
    path: 'apprenant/formation/:formationId',
    canActivate: [roleGuard('APPRENANT')],
    loadComponent: () =>
      import('./features/apprenant/formation/acces/acces').then((m) => m.Acces),
  },
  { path: '', pathMatch: 'full', redirectTo: versEspace },
  {
    path: 'connexion',
    canActivate: [visiteurGuard],
    loadComponent: () => import('./features/auth/connexion/connexion').then((m) => m.Connexion),
  },
  {
    path: 'inscription',
    canActivate: [visiteurGuard],
    loadComponent: () =>
      import('./features/auth/inscription/inscription').then((m) => m.Inscription),
  },

  // ─── Espace apprenant ─────────────────────────────────────────────────────
  // US18 : paiement d'une formation par l'apprenant.
  {
    path: 'apprenant/paiement/:formationId',
    canActivate: [roleGuard('APPRENANT')],
    loadComponent: () => import('./features/apprenant/paiement/payer/payer').then((m) => m.Payer),
  },
  {
    // US18 : résultat du paiement. URL de retour de la passerelle (voir services/passerelle.js du backend).
    path: 'paiement/resultat',
    canActivate: [roleGuard('APPRENANT')],
    loadComponent: () =>
      import('./features/apprenant/paiement/resultat/resultat').then((m) => m.Resultat),
  },
  {
    path: 'apprenant',
    canActivate: [roleGuard('APPRENANT')],
    loadComponent: () =>
      import('./features/espaces/espace-apprenant/espace-apprenant').then((m) => m.EspaceApprenant),
  },
  {
    // US23 — Passer un quiz
    path: 'apprenant/quiz/:quizId/passer',
    canActivate: [roleGuard('APPRENANT')],
    loadComponent: () =>
      import('./features/apprenant/quiz/quiz-passage/quiz-passage').then((m) => m.QuizPassage),
  },
  {
    // US24 — Résultat immédiat après soumission
    path: 'apprenant/quiz/:quizId/resultat/:tentativeId',
    canActivate: [roleGuard('APPRENANT')],
    loadComponent: () =>
      import('./features/apprenant/quiz/quiz-resultat/quiz-resultat').then((m) => m.QuizResultat),
  },

  // ─── Espace formateur ─────────────────────────────────────────────────────
  {
    path: 'formateur',
    canActivate: [roleGuard('FORMATEUR')],
    loadComponent: () =>
      import('./features/formateur/espace-formateur/espace-formateur').then(
        (m) => m.EspaceFormateur,
      ),
  },
  {
    // US22 — Créer/modifier le quiz d'un chapitre
    path: 'formateur/formations/:formationId/chapitres/:chapitreId/quiz',
    canActivate: [roleGuard('FORMATEUR')],
    loadComponent: () =>
      import('./features/apprenant/quiz/quiz-editeur/quiz-editeur').then((m) => m.QuizEditeur),
  },

  // ─── Espace agent (US39, US40, US12) ──────────────────────────────────────
  {
    path: 'agent/formations',
    canActivate: [roleGuard('AGENT')],
    loadComponent: () =>
      import('./features/agent/formations-soumises/formations-soumises').then(
        (m) => m.FormationsSoumises,
      ),
  },
  {
    path: 'agent/formations/:id',
    canActivate: [roleGuard('AGENT')],
    loadComponent: () =>
      import('./features/agent/formation-detail/formation-detail').then((m) => m.FormationDetail),
  },
  {
    path: 'agent',
    pathMatch: 'full',
    redirectTo: 'agent/formations',
  },

  { path: '**', redirectTo: versEspace },
];
