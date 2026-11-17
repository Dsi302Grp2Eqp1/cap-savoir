import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Formation } from '../models/formation.model';
@Component({
  selector: 'app-liste-formations',
  imports: [DecimalPipe],
  templateUrl: './liste-formations.html',
  styleUrl: './liste-formations.css',
})
export class ListeFormations {
  @Input({ required: true }) formations: Formation[] = [];
  @Input() selectionId?: string;
  @Input() charge = false;
  @Output() actualiser = new EventEmitter<void>();
  @Output() selectionner = new EventEmitter<string>();
}
