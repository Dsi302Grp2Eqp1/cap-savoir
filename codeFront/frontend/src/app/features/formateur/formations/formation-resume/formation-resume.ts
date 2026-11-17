import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Formation } from '../models/formation.model';
@Component({
  selector: 'app-formation-resume',
  imports: [DecimalPipe],
  templateUrl: './formation-resume.html',
  styleUrl: './formation-resume.css',
})
export class FormationResume {
  @Input({ required: true }) formation!: Formation;
  @Input() couverture = '';
}
