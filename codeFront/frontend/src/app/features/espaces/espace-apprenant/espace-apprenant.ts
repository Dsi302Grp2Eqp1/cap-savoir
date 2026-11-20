import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';

// US03 : espace réservé au rôle APPRENANT.
@Component({
  selector: 'app-espace-apprenant',
  templateUrl: './espace-apprenant.html',
  styleUrl: './espace-apprenant.css',
})
export class EspaceApprenant {
  readonly utilisateur = inject(AuthService).utilisateur;
}
