import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';

// US03 : espace réservé au rôle APPRENANT. Contenu à compléter par les US
// catalogue (US16), inscriptions (US17, US20), quiz (US23…) et certificats (US30…).
@Component({
  selector: 'app-espace-apprenant',
  templateUrl: './espace-apprenant.html',
  styleUrl: './espace-apprenant.css',
})
export class EspaceApprenant {
  readonly utilisateur = inject(AuthService).utilisateur;
}
