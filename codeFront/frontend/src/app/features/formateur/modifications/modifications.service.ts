import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/api.service';

const API = '/api/modifications/';

// Le jeton est ajouté par l'intercepteur d'authentification.
@Injectable({ providedIn: 'root' })
export class ModificationsService {
  private api = inject(ApiService);

  proposer(formationId: string, donnees: any) {
    return this.api.post<any>(API + encodeURIComponent(formationId), donnees);
  }

  lister(formationId: string) {
    return this.api.get<any[]>(API + encodeURIComponent(formationId));
  }
}
