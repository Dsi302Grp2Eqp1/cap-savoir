import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Chapitre } from '../../chapitres/models/chapitre.model';
import { BrouillonRessource, Ressource, DeplacementRessource } from '../models/ressource.model';
import { TYPES_RESSOURCES, LIBELLES_RESSOURCES, FORMATS_RESSOURCES } from '../ressource.config';
@Component({
  selector: 'app-ressources-chapitre',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './ressources-chapitre.html',
  styleUrl: './ressources-chapitre.css',
})
export class RessourcesChapitre {
  @Input({ required: true }) chapitre!: Chapitre;
  @Input({ required: true }) brouillon!: BrouillonRessource;
  @Input() version = 0;
  readonly types = TYPES_RESSOURCES;
  readonly libelles = LIBELLES_RESSOURCES;
  readonly formats = FORMATS_RESSOURCES;
  @Output() ajouter = new EventEmitter<void>();
  @Output() fichierChoisi = new EventEmitter<Event>();
  @Output() supprimer = new EventEmitter<Ressource>();
  @Output() telecharger = new EventEmitter<Ressource>();
  @Output() deplacer = new EventEmitter<DeplacementRessource>();
}
