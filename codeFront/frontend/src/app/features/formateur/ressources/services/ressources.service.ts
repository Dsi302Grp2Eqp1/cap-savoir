import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { Formation } from '../../formations/models/formation.model';
import { Fichier } from '../../shared/models/fichier.model';
import { TypeRessource } from '../models/ressource.model';
@Injectable({ providedIn: 'root' })
export class RessourcesService {
  private readonly api = inject(ApiService);

  ajouterRessource(
    id: string,
    chapitre: string,
    body: { titre: string; type: TypeRessource; contenu: Fichier },
  ) {
    return this.api.post<Formation>(`/api/formations/${id}/chapitres/${chapitre}/ressources`, body);
  }
  supprimerRessource(id: string, chapitre: string, ressource: string) {
    return this.api.delete<Formation>(
      `/api/formations/${id}/chapitres/${chapitre}/ressources/${ressource}`,
    );
  }
  ordonnerRessources(id: string, chapitre: string, ids: string[]) {
    return this.api.put<Formation>(`/api/formations/${id}/chapitres/${chapitre}/ressources/ordre`, {
      ids,
    });
  }
}
