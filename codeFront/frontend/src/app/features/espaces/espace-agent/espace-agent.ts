import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';

// US03 : espace réservé au rôle AGENT. Contenu à compléter par les US
// demandes formateur (US06, US38), validation des formations (US39, US40, US12…).
@Component({
  selector: 'app-espace-agent',
  templateUrl: './espace-agent.html',
  styleUrl: './espace-agent.css',
})
export class EspaceAgent {
  readonly utilisateur = inject(AuthService).utilisateur;
}
