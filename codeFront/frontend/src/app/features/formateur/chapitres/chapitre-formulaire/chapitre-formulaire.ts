import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrouillonChapitre } from '../models/chapitre.model';
@Component({
  selector: 'app-chapitre-formulaire',
  imports: [FormsModule],
  templateUrl: './chapitre-formulaire.html',
  styleUrl: './chapitre-formulaire.css',
})
export class ChapitreFormulaire {
  @Input({ required: true }) formulaire!: BrouillonChapitre;
  @Output() ajouter = new EventEmitter<void>();
}
