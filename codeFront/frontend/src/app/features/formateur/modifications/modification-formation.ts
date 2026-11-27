import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModificationsService } from './modifications.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-modification-formation',
  imports: [FormsModule,DatePipe],
  templateUrl: './modification-formation.html',
})
export class ModificationFormation implements OnChanges {
  private service = inject(ModificationsService);

  @Input() formation: any;

  titre = '';
  description = '';
  categories = '';
  prix = 0;
  message = signal('');
  erreur = signal('');
  demandes = signal<any[]>([]);

  ngOnChanges() {
    this.titre = this.formation.titre;
    this.description = this.formation.description;
    this.categories = (this.formation.categories || []).join(', ');
    this.prix = this.formation.prix;
    this.message.set('');
    this.erreur.set('');
    this.charger();
  }

  charger() {
    this.service.lister(this.formation._id).subscribe({
      next: (liste) => this.demandes.set(liste),
    });
  }

  envoyer() {
    this.message.set('');
    this.erreur.set('');

    const morceaux = this.categories.split(',');
    const liste: string[] = [];
    for (const m of morceaux) {
      if (m.trim() !== '') {
        liste.push(m.trim());
      }
    }

    const donnees = {
      titre: this.titre,
      description: this.description,
      categories: liste,
      prix: this.prix,
    };

    this.service.proposer(this.formation._id, donnees).subscribe({
      next: () => {
        this.message.set("Modification envoyée à l'agent.");
        this.charger();
      },
      error: (err) => {
        this.erreur.set(err.error?.erreur || "Impossible d'envoyer la modification.");
      },
    });
  }
}