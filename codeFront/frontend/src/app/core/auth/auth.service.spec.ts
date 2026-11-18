import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from '../api.service';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { Utilisateur } from './auth.model';

const api = environment.apiUrl;
const apprenant: Utilisateur = {
  _id: '1',
  nom: 'Test',
  prenom: 'Amine',
  email: 'amine@example.com',
  roles: ['APPRENANT'],
  dateCreation: '2026-11-18T00:00:00.000Z',
};

describe('AuthService (US02/US03)', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        // Route générique : la déconnexion redirige vers /connexion.
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function connecter(utilisateur = apprenant) {
    const promesse = firstValueFrom(auth.connecter('amine@example.com', 'Secret123'));
    http.expectOne(`${api}/api/auth/connexion`).flush({ jeton: 'jeton-1', utilisateur });
    await promesse;
  }

  it('enregistre la session après connexion et choisit l’espace du rôle', async () => {
    expect(auth.connecte()).toBe(false);
    expect(auth.espaceParDefaut()).toBe('/connexion');
    await connecter();
    expect(auth.connecte()).toBe(true);
    expect(auth.espaceParDefaut()).toBe('/apprenant');
    expect(JSON.parse(localStorage.getItem('capsavoir.session')!).jeton).toBe('jeton-1');
  });

  it('priorise l’espace agent puis formateur pour plusieurs rôles', async () => {
    await connecter({ ...apprenant, roles: ['APPRENANT', 'FORMATEUR'] });
    expect(auth.espaceParDefaut()).toBe('/formateur');
    expect(auth.espaces().map((e) => e.role)).toEqual(['FORMATEUR', 'APPRENANT']);
  });

  it('ajoute le jeton aux appels API', async () => {
    await connecter();
    TestBed.inject(ApiService).get('/api/formations').subscribe();
    const req = http.expectOne(`${api}/api/formations`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jeton-1');
    req.flush([]);
  });

  it('supprime la session si l’API répond 401', async () => {
    await connecter();
    TestBed.inject(ApiService).get('/api/formations').subscribe({ error: () => undefined });
    http.expectOne(`${api}/api/formations`).flush({ erreur: 'Session expirée' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.connecte()).toBe(false);
    expect(localStorage.getItem('capsavoir.session')).toBeNull();
  });

  it('déconnexion : appelle l’API puis supprime la session', async () => {
    await connecter();
    const promesse = auth.deconnecter();
    const req = http.expectOne(`${api}/api/auth/deconnexion`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jeton-1');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await promesse;
    expect(auth.connecte()).toBe(false);
  });

  it('restaurer : met les rôles à jour, ou supprime une session refusée', async () => {
    await connecter();
    let promesse = auth.restaurer();
    http.expectOne(`${api}/api/auth/moi`).flush({ ...apprenant, roles: ['APPRENANT', 'AGENT'] });
    await promesse;
    expect(auth.espaceParDefaut()).toBe('/agent');

    promesse = auth.restaurer();
    http.expectOne(`${api}/api/auth/moi`).flush({ erreur: 'x' }, { status: 401, statusText: 'Unauthorized' });
    await promesse;
    expect(auth.connecte()).toBe(false);
  });
});
