import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AgentService } from '../agent.service';

@Component({
  selector: 'app-modifications',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './modifications.html',
    styleUrl: './modifications.css',

})
export class Modifications implements OnInit {
  private service = inject(AgentService);

  liste = signal<any[]>([]);
  selection = signal<any>(null);
  erreur = signal('');
  succes = signal('');
  refus = false;
  commentaire = '';

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.service.listerModifications().subscribe({
      next: (r) => this.liste.set(r),
      error: (e) => this.erreur.set(e.error?.erreur || 'API indisponible.'),
    });
  }

  ouvrir(id: string) {
    this.erreur.set('');
    this.succes.set('');
    this.refus = false;
    this.commentaire = '';
    this.service.detailModification(id).subscribe({
      next: (r) => this.selection.set(r),
      error: (e) => this.erreur.set(e.error?.erreur || 'Impossible de charger la modification.'),
    });
  }

  different(champ: string) {
    const s = this.selection();
    if (!s) {
      return false;
    }
    return JSON.stringify(s.formation[champ]) !== JSON.stringify(s.demande.contenuPropose[champ]);
  }

  accepter() {
    this.envoyer('accepter', '');
  }

  confirmerRefus() {
    if (!this.commentaire.trim()) {
      this.erreur.set('Un motif est obligatoire pour refuser.');
      return;
    }
    this.envoyer('refuser', this.commentaire.trim());
  }

  private envoyer(decision: string, commentaire: string) {
    this.erreur.set('');
    this.succes.set('');
    const id = this.selection().demande._id;
    this.service.traiterModification(id, decision, commentaire).subscribe({
      next: () => {
        if (decision === 'accepter') {
          this.succes.set('Modification acceptée : la formation publiée est mise à jour.');
        } else {
          this.succes.set('Modification refusée. Le formateur verra le motif.');
        }
        this.selection.set(null);
        this.refus = false;
        this.commentaire = '';
        this.charger();
      },
      error: (e) => this.erreur.set(e.error?.erreur || 'Action impossible.'),
    });
  }
}