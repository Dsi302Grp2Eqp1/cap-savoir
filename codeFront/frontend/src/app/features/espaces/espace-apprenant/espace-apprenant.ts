import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

// US03 : espace réservé au rôle APPRENANT.
@Component({
  selector: 'app-espace-apprenant',
  imports: [RouterLink],
  templateUrl: './espace-apprenant.html',
  styleUrl: './espace-apprenant.css',
})
export class EspaceApprenant {
  private readonly auth = inject(AuthService);
  readonly utilisateur = this.auth.utilisateur;

  // US05 : le lien « Devenir formateur » n'est proposé qu'aux non-formateurs.
  aRole(role: 'FORMATEUR'): boolean {
    return this.auth.aRole(role);
  }
}
