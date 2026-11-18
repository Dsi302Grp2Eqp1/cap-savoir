import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chapitre, BrouillonChapitre } from '../models/chapitre.model';
@Component({
  selector: 'app-chapitre-editeur',
  imports: [FormsModule],
  templateUrl: './chapitre-editeur.html',
  styleUrl: './chapitre-editeur.css',
})
export class ChapitreEditeur {
  @Input({ required: true }) chapitre!: Chapitre;
  @Input({ required: true }) brouillon!: BrouillonChapitre;
  @Input() index = 0;
  @Input() total = 0;
  @Output() enregistrer = new EventEmitter<void>();
  @Output() supprimer = new EventEmitter<void>();
  @Output() deplacer = new EventEmitter<number>();
}
