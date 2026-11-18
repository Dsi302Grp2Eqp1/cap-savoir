import { HttpErrorResponse } from '@angular/common/http';

/** Message lisible à partir d'une erreur de l'API ({ erreur: "..." }). */
export function messageErreur(err: unknown, parDefaut = 'Une erreur est survenue. Réessayez.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'API indisponible. Vérifiez votre connexion puis réessayez.';
    if (typeof err.error?.erreur === 'string') return err.error.erreur;
  }
  return parDefaut;
}
