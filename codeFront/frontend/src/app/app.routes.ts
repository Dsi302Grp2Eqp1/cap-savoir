import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { roleGuard, visiteurGuard } from './core/auth/auth.guards';
import { AuthService } from './core/auth/auth.service';

// US03 : chaque espace est réservé à son rôle ; l'accueil ouvre l'espace de l'utilisateur.
const versEspace = () => inject(AuthService).espaceParDefaut();

export const routes: Routes = [
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
  // ─── Espace apprenant (P4 : US23, US24) ───────────────────────────────────
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
  // ─── Espace formateur (P4 : US22) ─────────────────────────────────────────
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
  {
    path: 'agent',
    canActivate: [roleGuard('AGENT')],
    loadComponent: () =>
      import('./features/espaces/espace-agent/espace-agent').then((m) => m.EspaceAgent),
  },
  { path: '**', redirectTo: versEspace },
];
