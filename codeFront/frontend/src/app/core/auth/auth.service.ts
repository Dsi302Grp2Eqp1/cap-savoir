import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { ApiService } from '../api.service';
import { DonneesInscription, Role, Session, Utilisateur } from './auth.model';
import { ESPACES } from './espaces';

const CLE_STOCKAGE = 'capsavoir.session';

/** Session de l'utilisateur connecté (US01, US02, US03). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly session = signal<Session | null>(lireSession());

  readonly utilisateur = computed(() => this.session()?.utilisateur ?? null);
  readonly connecte = computed(() => this.session() !== null);
  /** Espaces accessibles à l'utilisateur, pour le menu (US03). */
  readonly espaces = computed(() => {
    const roles = this.utilisateur()?.roles ?? [];
    return ESPACES.filter((espace) => roles.includes(espace.role));
  });

  jeton(): string | null {
    return this.session()?.jeton ?? null;
  }

  aRole(...roles: Role[]): boolean {
    const actuels = this.utilisateur()?.roles ?? [];
    return roles.some((role) => actuels.includes(role));
  }

  /** Chemin de l'espace à ouvrir : celui du rôle principal, ou la connexion. */
  espaceParDefaut(): string {
    return this.espaces()[0]?.chemin ?? '/connexion';
  }

  // US01
  inscrire(donnees: DonneesInscription): Observable<Utilisateur> {
    return this.api.post<Utilisateur>('/api/auth/inscription', donnees);
  }

  // US02
  connecter(email: string, motDePasse: string): Observable<Session> {
    return this.api
      .post<Session>('/api/auth/connexion', { email, motDePasse })
      .pipe(tap((session) => this.enregistrer(session)));
  }

  // US02 : invalide la session côté serveur, puis localement dans tous les cas.
  async deconnecter(): Promise<void> {
    try {
      await firstValueFrom(this.api.post<void>('/api/auth/deconnexion', {}));
    } catch {
      // Session déjà expirée ou API indisponible : la session locale est supprimée quand même.
    }
    this.terminerSession();
    await this.router.navigateByUrl('/connexion');
  }

  /** Au démarrage : vérifie la session enregistrée et met les rôles à jour. */
  async restaurer(): Promise<void> {
    const session = this.session();
    if (!session) return;
    try {
      const utilisateur = await firstValueFrom(this.api.get<Utilisateur>('/api/auth/moi'));
      this.enregistrer({ ...session, utilisateur });
    } catch (err) {
      // 401 : session expirée ou déconnectée ailleurs. Hors ligne : on garde la session locale.
      if (err instanceof HttpErrorResponse && err.status === 401) this.terminerSession();
    }
  }

  /** Supprime la session locale (déconnexion ou jeton refusé par l'API). */
  terminerSession(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(CLE_STOCKAGE);
    } catch {
      // Stockage indisponible (navigation privée) : rien à supprimer.
    }
  }

  private enregistrer(session: Session): void {
    this.session.set(session);
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(session));
    } catch {
      // Stockage indisponible : la session reste valable jusqu'au rechargement de la page.
    }
  }
}

function lireSession(): Session | null {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    const session = brut ? (JSON.parse(brut) as Session) : null;
    return session?.jeton && Array.isArray(session.utilisateur?.roles) ? session : null;
  } catch {
    return null;
  }
}
