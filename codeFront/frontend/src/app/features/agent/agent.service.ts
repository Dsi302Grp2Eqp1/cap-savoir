import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export const SERVER = 'http://localhost:3000';
const API = SERVER + '/api/agent';

export interface Formation {
  _id: string;
  titre: string;
  description: string;
  statut: string;
  prix: number;
  categories: string[];
  image?: { url: string };
  formateur: { nom: string; prenom: string };
  dateCreation: string;
  dateSoumission?: string;
  chapitres?: any[];
}

export interface Demande {
  _id: string;
  statut: string;
  typeValidation: string;
  commentaire?: string;
  dateSoumission?: string;
  dateDecision?: string;
}

export interface ListeReponse {
  formations: Formation[];
  message: string | null;
}

export interface DetailReponse {
  formation: Formation;
  demande: Demande | null;
}

/** Image par défaut quand la formation n'a pas d'image ou que l'URL ne charge pas. */
export const IMAGE_PAR_DEFAUT =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260"><rect width="100%" height="100%" fill="%23ede9fe"/></svg>';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private http = inject(HttpClient);

  lister(filtres: { q: string; formateur: string; statut: string }): Observable<ListeReponse> {
    let params = new HttpParams();
    if (filtres.q) params = params.set('q', filtres.q);
    if (filtres.formateur) params = params.set('formateur', filtres.formateur);
    // statut vide = « Tous » : on n'envoie pas le paramètre
    if (filtres.statut) params = params.set('statut', filtres.statut);
    return this.http.get<ListeReponse>(API + '/formations', { params });
  }

  detail(id: string): Observable<DetailReponse> {
    return this.http.get<DetailReponse>(API + '/formations/' + id);
  }

  traiter(
    id: string,
    decision: 'accepter' | 'refuser',
    commentaire?: string,
  ): Observable<DetailReponse> {
    return this.http.patch<DetailReponse>(API + '/formations/' + id + '/traiter', {
      decision,
      commentaire,
    });
  }
}