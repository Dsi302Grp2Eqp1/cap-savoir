import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormulaireFormation } from '../models/formation.model';
import { FORMATS_RESSOURCES } from '../../ressources/ressource.config';
@Component({
  selector: 'app-formation-formulaire',
  imports: [FormsModule],
  templateUrl: './formation-formulaire.html',
  styleUrl: './formation-formulaire.css',
})
export class FormationFormulaire {
  @Input({ required: true }) formulaire!: FormulaireFormation;
  @Input() image?: File;
  @Input() charge = false;
  readonly formatsImage = FORMATS_RESSOURCES.IMAGE;
  @Output() enregistrer = new EventEmitter<void>();
  @Output() imageChoisie = new EventEmitter<Event>();
}
