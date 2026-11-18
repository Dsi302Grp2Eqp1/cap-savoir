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
  {
    path: 'apprenant',
    canActivate: [roleGuard('APPRENANT')],
    loadComponent: () =>
      import('./features/espaces/espace-apprenant/espace-apprenant').then((m) => m.EspaceApprenant),
  },
  {
    path: 'formateur',
    canActivate: [roleGuard('FORMATEUR')],
    loadComponent: () =>
      import('./features/formateur/espace-formateur/espace-formateur').then(
        (m) => m.EspaceFormateur,
      ),
  },
  {
    path: 'agent',
    canActivate: [roleGuard('AGENT')],
    loadComponent: () =>
      import('./features/espaces/espace-agent/espace-agent').then((m) => m.EspaceAgent),
  },
  { path: '**', redirectTo: versEspace },
];
