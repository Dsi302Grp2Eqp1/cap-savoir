import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { roleGuard, visiteurGuard } from './auth.guards';
import { Utilisateur } from './auth.model';

function ouvrirSession(roles: Utilisateur['roles'] | null) {
  localStorage.clear();
  if (roles) {
    const utilisateur = { _id: '1', nom: 'T', prenom: 'T', email: 't@ex.com', roles, dateCreation: '' };
    localStorage.setItem('capsavoir.session', JSON.stringify({ jeton: 'j', utilisateur }));
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
}

function executer(garde: ReturnType<typeof roleGuard>, url = '/agent') {
  return TestBed.runInInjectionContext(() =>
    garde({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

const chemin = (resultat: unknown) => (resultat as UrlTree).toString();

describe('Gardes de route (US03)', () => {
  it('visiteur → connexion avec retour vers la page demandée', () => {
    ouvrirSession(null);
    expect(chemin(executer(roleGuard('AGENT')))).toBe('/connexion?retour=%2Fagent');
  });

  it('rôle autorisé → accès', () => {
    ouvrirSession(['AGENT']);
    expect(executer(roleGuard('AGENT'))).toBe(true);
  });

  it('autre rôle → redirection vers son propre espace', () => {
    ouvrirSession(['APPRENANT']);
    expect(chemin(executer(roleGuard('AGENT')))).toBe('/apprenant');
  });

  it('pages connexion / inscription : un utilisateur connecté va à son espace', () => {
    ouvrirSession(['FORMATEUR', 'APPRENANT']);
    expect(chemin(executer(visiteurGuard))).toBe('/formateur');
    ouvrirSession(null);
    expect(executer(visiteurGuard)).toBe(true);
  });
});
