import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

const API = '/api/demandes-formateur';

export type StatutDemande = 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE';

/** Demande telle que l'API la renvoie au demandeur (US07). */
export interface DemandeFormateur {
  _id: string;
  statut: StatutDemande;
  dateSoumission: string;
  dateDecision: string | null;
  commentaire: string | null;
  domaineExpertise: string;
  experience: string;
  cv: { nom: string };
}

export interface Candidature {
  domaineExpertise: string;
  experience: string;
  cv: File;
}

/** Front-office du parcours « devenir formateur ». La décision est prise dans le back-office agent. */
@Injectable({ providedIn: 'root' })
export class DemandeFormateurService {
  private readonly api = inject(ApiService);

  // US05 : envoi multipart (le navigateur ajoute lui-même l'en-tête Content-Type).
  deposer(candidature: Candidature): Observable<DemandeFormateur> {
    const form = new FormData();
    form.append('domaineExpertise', candidature.domaineExpertise);
    form.append('experience', candidature.experience);
    form.append('cv', candidature.cv);
    return this.api.post<DemandeFormateur>(API, form);
  }

  // US07
  mesDemandes(): Observable<DemandeFormateur[]> {
    return this.api.get<DemandeFormateur[]>(`${API}/moi`);
  }
}
