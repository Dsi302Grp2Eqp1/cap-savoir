import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { Formation } from '../../formations/models/formation.model';
import { BrouillonChapitre } from '../models/chapitre.model';
@Injectable({ providedIn: 'root' })
export class ChapitresService {
  private readonly api = inject(ApiService);

  ajouterChapitre(id: string, body: BrouillonChapitre) {
    return this.api.post<Formation>(`/api/formations/${id}/chapitres`, body);
  }
  modifierChapitre(id: string, chapitre: string, body: BrouillonChapitre) {
    return this.api.patch<Formation>(`/api/formations/${id}/chapitres/${chapitre}`, body);
  }
  supprimerChapitre(id: string, chapitre: string) {
    return this.api.delete<Formation>(`/api/formations/${id}/chapitres/${chapitre}`);
  }
  ordonnerChapitres(id: string, ids: string[]) {
    return this.api.put<Formation>(`/api/formations/${id}/chapitres/ordre`, { ids });
  }
}
