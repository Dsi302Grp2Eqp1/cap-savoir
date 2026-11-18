import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { Formation, NouvelleFormation } from '../models/formation.model';
@Injectable({ providedIn: 'root' })
export class FormationsService {
  private readonly api = inject(ApiService);

  lister() {
    return this.api.get<Formation[]>('/api/formations');
  }
  obtenir(id: string) {
    return this.api.get<Formation>(`/api/formations/${id}`);
  }
  creer(body: NouvelleFormation) {
    return this.api.post<Formation>('/api/formations', body);
  }
}
