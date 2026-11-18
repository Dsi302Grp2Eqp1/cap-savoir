import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MOT_DE_PASSE_MIN, motDePasseValide } from '../../../core/auth/espaces';
import { DonneesInscription } from '../../../core/auth/auth.model';
import { messageErreur } from '../erreur-api';

// US01 : création d'un compte apprenant, puis connexion automatique (US02/US03).
@Component({
  selector: 'app-inscription',
  imports: [FormsModule, RouterLink],
  templateUrl: './inscription.html',
  styleUrl: './inscription.css',
})
export class Inscription {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly charge = signal(false);
  readonly erreur = signal('');
  readonly longueurMin = MOT_DE_PASSE_MIN;
  formulaire: DonneesInscription = { nom: '', prenom: '', email: '', motDePasse: '' };
  confirmation = '';

  motDePasseValide(): boolean {
    return motDePasseValide(this.formulaire.motDePasse);
  }

  confirmationValide(): boolean {
    return this.confirmation === this.formulaire.motDePasse;
  }

  async inscrire() {
    if (this.charge() || !this.motDePasseValide() || !this.confirmationValide()) return;
    this.erreur.set('');
    this.charge.set(true);
    const { email, motDePasse } = this.formulaire;
    try {
      await firstValueFrom(this.auth.inscrire(this.formulaire));
    } catch (err) {
      this.erreur.set(messageErreur(err));
      this.charge.set(false);
      return;
    }
    try {
      await firstValueFrom(this.auth.connecter(email, motDePasse));
      await this.router.navigateByUrl(this.auth.espaceParDefaut());
    } catch {
      // Compte créé mais connexion automatique impossible : connexion manuelle.
      await this.router.navigate(['/connexion'], { queryParams: { inscrit: 1, email } });
    } finally {
      this.charge.set(false);
    }
  }
}
