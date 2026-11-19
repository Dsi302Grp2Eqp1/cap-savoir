import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AgentService, Demande, Formation, IMAGE_PAR_DEFAUT, SERVER } from '../agent.service';

@Component({
  selector: 'app-formation-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './formation-detail.html',
  styleUrl: './formation-detail.css',
})
export class FormationDetail implements OnInit {
  private service = inject(AgentService);
  private route = inject(ActivatedRoute);
  readonly serveur = SERVER;
  readonly placeholder = IMAGE_PAR_DEFAUT;

  id = '';
  formation = signal<Formation | null>(null);
  demande = signal<Demande | null>(null);
  erreur = signal<string | null>(null);
  succes = signal<string | null>(null);
  chargement = signal(true);
  envoi = signal(false);

  refus = false; // affiche le champ motif
  commentaire = '';

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.charger();
  }

  charger() {
    this.chargement.set(true);
    this.service.detail(this.id).subscribe({
      next: (r) => {
        this.formation.set(r.formation);
        this.demande.set(r.demande);
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(e.error?.erreur ?? 'API indisponible.');
        this.chargement.set(false);
      },
    });
  }

  get peutTraiter() {
    return this.formation()?.statut === 'SOUMISE';
  }

  urlImage(f: Formation): string {
    return f.image?.url ? this.serveur + f.image.url : this.placeholder;
  }

  imageErreur(e: Event) {
    (e.target as HTMLImageElement).src = this.placeholder;
  }

  accepter() {
    this.envoyer('accepter');
  }

  confirmerRefus() {
    if (!this.commentaire.trim()) {
      this.erreur.set('Un motif est obligatoire pour refuser.');
      return;
    }
    this.envoyer('refuser', this.commentaire.trim());
  }

  private envoyer(decision: 'accepter' | 'refuser', commentaire?: string) {
    this.envoi.set(true);
    this.erreur.set(null);
    this.succes.set(null);
    this.service.traiter(this.id, decision, commentaire).subscribe({
      next: (r) => {
        this.formation.set(r.formation);
        this.demande.set(r.demande);
        this.refus = false;
        this.commentaire = '';
        this.envoi.set(false);
        this.succes.set(
          decision === 'accepter'
            ? 'Formation acceptée et publiée au catalogue.'
            : 'Formation refusée. Le formateur verra votre motif.',
        );
      },
      error: (e) => {
        this.erreur.set(e.error?.erreur ?? 'Action impossible.');
        this.envoi.set(false);
      },
    });
  }
}