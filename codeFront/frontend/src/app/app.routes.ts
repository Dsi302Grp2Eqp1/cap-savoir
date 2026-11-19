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