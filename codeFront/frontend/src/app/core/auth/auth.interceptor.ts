import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Ajoute le jeton de session aux appels vers l'API (US02).
 * Si l'API répond 401 (session expirée ou invalidée), la session locale est
 * supprimée et l'utilisateur est renvoyé vers la connexion.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const jeton = auth.jeton();
  const requete = jeton ? req.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } }) : req;

  return next(requete).pipe(
    catchError((err: unknown) => {
      const routeAuth = /\/api\/auth\/(connexion|inscription|deconnexion|moi)$/.test(req.url);
      if (err instanceof HttpErrorResponse && err.status === 401 && jeton && !routeAuth) {
        auth.terminerSession();
        void router.navigate(['/connexion'], { queryParams: { retour: router.url, expiree: 1 } });
      }
      return throwError(() => err);
    }),
  );
};
