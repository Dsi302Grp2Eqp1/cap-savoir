import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/api.service';

const API = '/api/catalogue';

@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private api = inject(ApiService);

  rechercher(filtres: any) {
    const params = new URLSearchParams();
    for (const cle of Object.keys(filtres)) {
      if (filtres[cle] !== '' && filtres[cle] !== null && filtres[cle] !== undefined) {
        params.set(cle, String(filtres[cle]));
      }
    }
    const requete = params.toString();
    return this.api.get<any>(requete ? `${API}?${requete}` : API);
  }

  listerCategories() {
    return this.api.get<string[]>(`${API}/categories`);
  }
}
