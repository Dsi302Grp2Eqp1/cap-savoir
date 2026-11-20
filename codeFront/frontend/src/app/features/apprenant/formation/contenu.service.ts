import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/api.service';

export interface RessourceResume {
  _id: string;
  titre: string;
  type: string;
  ordre: number;
}

export interface ChapitreContenu {
  _id: string;
  titre: string;
  description?: string;
  ordre: number;
  ressources: RessourceResume[];
}

export interface ContenuFormation {
  formationId: string;
  titre: string;
  chapitres: ChapitreContenu[];
}

// US19 : le serveur vérifie l'inscription ACTIVE ; le navigateur ne décide jamais de l'accès.
@Injectable({ providedIn: 'root' })
export class ContenuService {
  private readonly api = inject(ApiService);

  lireContenu(formationId: string) {
    return this.api.get<ContenuFormation>(`/api/contenu/${formationId}`);
  }
}
