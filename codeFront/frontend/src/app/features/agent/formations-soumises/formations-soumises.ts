import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AgentService, Formation, IMAGE_PAR_DEFAUT } from '../agent.service';

@Component({
  selector: 'app-formations-soumises',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './formations-soumises.html',
  styleUrl: './formations-soumises.css',
})
export class FormationsSoumises implements OnInit {
  private service = inject(AgentService);
  readonly placeholder = IMAGE_PAR_DEFAUT;

  q = '';
  formateur = '';
  statut = ''; // '' = Tous
  readonly statuts = [
    { valeur: '', libelle: 'Tous' },
    { valeur: 'SOUMISE', libelle: 'SOUMISE' },
    { valeur: 'PUBLIEE', libelle: 'PUBLIEE' },
    { valeur: 'BROUILLON', libelle: 'BROUILLON' },
    { valeur: 'ARCHIVEE', libelle: 'ARCHIVEE' },
  ];

  formations = signal<Formation[]>([]);
  message = signal<string | null>(null);
  erreur = signal<string | null>(null);
  chargement = signal(false);

  ngOnInit() {
    this.rechercher();
  }

  rechercher() {
    this.chargement.set(true);
    this.erreur.set(null);
    this.service.lister({ q: this.q, formateur: this.formateur, statut: this.statut }).subscribe({
      next: (r) => {
        this.formations.set(r.formations);
        this.message.set(r.message);
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(e.error?.erreur ?? 'API indisponible. Réessayez.');
        this.chargement.set(false);
      },
    });
  }

  reinitialiser() {
    this.q = '';
    this.formateur = '';
    this.statut = '';
    this.rechercher();
  }

  // Les fichiers (/api/fichiers) sont réservés au formateur propriétaire : une balise <img>
  // ne peut pas les afficher pour un agent. Image neutre en attendant une route dédiée.
  urlImage(_f: Formation): string {
    return this.placeholder;
  }

  imageErreur(e: Event) {
    (e.target as HTMLImageElement).src = this.placeholder;
  }
}