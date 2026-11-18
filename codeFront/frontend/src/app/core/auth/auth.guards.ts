import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from './auth.model';
import { AuthService } from './auth.service';

/**
 * US03 : réserve une route à un ou plusieurs rôles.
 * - non connecté → page de connexion, avec retour vers la page demandée ;
 * - connecté sans le rôle → redirection vers son propre espace.
 * Le contrôle réel est fait par l'API (403) : ce garde évite seulement d'afficher la page.
 */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.connecte()) {
      return router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
    }
    return auth.aRole(...roles) ? true : router.parseUrl(auth.espaceParDefaut());
  };
}

/** Pages de connexion et d'inscription : un utilisateur connecté va directement à son espace. */
export const visiteurGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.connecte() ? inject(Router).parseUrl(auth.espaceParDefaut()) : true;
};
