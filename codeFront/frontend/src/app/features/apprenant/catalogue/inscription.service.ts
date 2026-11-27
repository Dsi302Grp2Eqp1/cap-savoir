import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/api.service';

// Le jeton est ajouté par l'intercepteur d'authentification.
@Injectable({ providedIn: 'root' })
export class InscriptionService {
  private api = inject(ApiService);

  inscrire(formationId: string) {
    return this.api.post<any>('/api/inscriptions', { formationId: formationId });
  }
}
