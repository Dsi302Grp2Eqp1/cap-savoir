import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogueService } from './catalogue.service';
import { InscriptionService } from './inscription.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-catalogue',
  imports: [FormsModule],
  templateUrl: './catalogue.component.html',
  styleUrls: ['./catalogue.component.css'],
})
export class CatalogueComponent implements OnInit {
  private service = inject(CatalogueService);
  private inscriptionService = inject(InscriptionService);
  private auth = inject(AuthService);
  private router = inject(Router);

  formations = signal<any[]>([]);
  categories = signal<string[]>([]);
  page = signal(1);
  totalPages = signal(1);
  erreur = signal('');
  message = signal('');

  titre = '';
  categorie = '';
  prixMin: number | null = null;
  prixMax: number | null = null;

  ngOnInit() {
    this.service.listerCategories().subscribe({
      next: (liste) => this.categories.set(liste),
    });
    this.charger();
  }

  charger() {
    const filtres = {
      titre: this.titre,
      categorie: this.categorie,
      prixMin: this.prixMin,
      prixMax: this.prixMax,
      page: this.page(),
      limit: 9,
    };

    this.service.rechercher(filtres).subscribe({
      next: (resultat) => {
        this.formations.set(resultat.formations);
        this.totalPages.set(resultat.totalPages || 1);
        this.erreur.set('');
      },
      error: () => {
        this.erreur.set('Impossible de charger les formations.');
      },
    });
  }

  rechercher() {
    this.page.set(1);
    this.charger();
  }

  reinitialiser() {
    this.titre = '';
    this.categorie = '';
    this.prixMin = null;
    this.prixMax = null;
    this.rechercher();
  }

  urlImage(formation: any) {
    const url = formation.image?.url;
    if (!url) {
      return '';
    }
    if (url.startsWith('http')) {
      return url;
    }
    return 'http://localhost:3000' + url;
  }

  pagePrecedente() {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
      this.charger();
    }
  }

  pageSuivante() {
    if (this.page() < this.totalPages()) {
      this.page.set(this.page() + 1);
      this.charger();
    }
  }

  sInscrire(formation: any) {
    this.message.set('');

    if (!this.auth.connecte()) {
      this.router.navigate(['/connexion'], { queryParams: { retour: '/catalogue' } });
      return;
    }

    const id = formation._id || formation.id;

    this.inscriptionService.inscrire(id).subscribe({
      next: () => {
        this.router.navigate(['/apprenant/paiement', id]);
      },
      error: (err) => {
        const texte = err.error?.erreur || "Impossible de s'inscrire.";
        this.message.set(texte);
      },
    });
  }
}