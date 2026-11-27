import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { messageErreur } from '../../auth/erreur-api';
import { DemandeFormateur, DemandeFormateurService } from '../demande-formateur.service';

const TAILLE_MAX_CV = 5 * 1024 * 1024; // identique au backend

// US05 : déposer une demande pour devenir formateur.
// US07 : voir le statut de ses demandes et le motif d'un refus.
@Component({
  selector: 'app-devenir-formateur',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './devenir-formateur.html',
})
export class DevenirFormateur implements OnInit {
  private readonly service = inject(DemandeFormateurService);
  protected readonly auth = inject(AuthService);

  readonly demandes = signal<DemandeFormateur[]>([]);
  readonly charge = signal(false);
  readonly erreur = signal('');
  readonly succes = signal('');
  /** Le formulaire est masqué tant qu'une demande attend la décision de l'agent. */
  readonly enAttente = computed(() => this.demandes().some((d) => d.statut === 'EN_ATTENTE'));

  readonly libelles = { EN_ATTENTE: 'En attente', ACCEPTEE: 'Acceptée', REFUSEE: 'Refusée' };

  domaineExpertise = '';
  experience = '';
  cv: File | null = null;
  erreurCv = '';

  ngOnInit(): void {
    void this.charger();
  }

  async charger(): Promise<void> {
    try {
      this.demandes.set(await firstValueFrom(this.service.mesDemandes()));
      // Demande acceptée : les rôles sont relus pour afficher l'espace formateur.
      if (this.demandes().some((d) => d.statut === 'ACCEPTEE') && !this.auth.aRole('FORMATEUR')) {
        await this.auth.restaurer();
      }
    } catch (err) {
      this.erreur.set(messageErreur(err));
    }
  }

  choisirCv(event: Event): void {
    const fichier = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.erreurCv = '';
    if (fichier && fichier.type !== 'application/pdf') this.erreurCv = 'Choisissez un fichier PDF.';
    else if (fichier && fichier.size > TAILLE_MAX_CV) this.erreurCv = 'Le CV ne doit pas dépasser 5 Mo.';
    this.cv = this.erreurCv ? null : fichier;
  }

  async envoyer(): Promise<void> {
    if (this.charge()) return;
    if (!this.cv) {
      this.erreurCv ||= 'Le CV (PDF) est obligatoire.';
      return;
    }
    this.erreur.set('');
    this.succes.set('');
    this.charge.set(true);
    try {
      await firstValueFrom(
        this.service.deposer({
          domaineExpertise: this.domaineExpertise.trim(),
          experience: this.experience.trim(),
          cv: this.cv,
        }),
      );
      this.succes.set("Demande envoyée. Un agent va l'examiner.");
      this.domaineExpertise = '';
      this.experience = '';
      this.cv = null;
      await this.charger();
    } catch (err) {
      this.erreur.set(messageErreur(err));
    } finally {
      this.charge.set(false);
    }
  }
}
