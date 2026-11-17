import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { Fichier } from '../models/fichier.model';
import { TypeRessource } from '../../ressources/models/ressource.model';
@Injectable({ providedIn: 'root' })
export class FichiersService {
  private readonly api = inject(ApiService);

  televerser(file: File, type: TypeRessource) {
    const form = new FormData();
    form.append('fichier', file);
    return this.api.post<Fichier>(`/api/fichiers?type=${type}`, form);
  }
  fichier(url: string) {
    return this.api.fichier(url);
  }
}
