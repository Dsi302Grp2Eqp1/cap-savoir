import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { messageErreur } from '../erreur-api';

// US02 : connexion. Après succès, retour à la page demandée ou à l'espace du rôle (US03).
@Component({
  selector: 'app-connexion',
  imports: [FormsModule, RouterLink],
  templateUrl: './connexion.html',
  styleUrl: './connexion.css',
})
export class Connexion {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly charge = signal(false);
  readonly erreur = signal('');
  readonly expiree = this.route.snapshot.queryParamMap.has('expiree');
  readonly nouveauCompte = this.route.snapshot.queryParamMap.has('inscrit');
  email = this.route.snapshot.queryParamMap.get('email') ?? '';
  motDePasse = '';

  async connecter() {
    if (this.charge()) return;
    this.erreur.set('');
    this.charge.set(true);
    try {
      await firstValueFrom(this.auth.connecter(this.email, this.motDePasse));
      await this.router.navigateByUrl(this.destination());
    } catch (err) {
      this.motDePasse = '';
      this.erreur.set(messageErreur(err));
    } finally {
      this.charge.set(false);
    }
  }

  // Seuls les chemins internes sont acceptés (pas de redirection vers un autre site).
  private destination(): string {
    const retour = this.route.snapshot.queryParamMap.get('retour') ?? '';
    const interne = retour.startsWith('/') && !retour.startsWith('//') && !retour.startsWith('/connexion');
    return interne ? retour : this.auth.espaceParDefaut();
  }
}
