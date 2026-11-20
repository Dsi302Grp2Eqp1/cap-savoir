import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/api.service';

export interface Checkout {
  url: string;
  paiementId: string;
}

export interface StatutPaiement {
  paiement: 'EN_ATTENTE' | 'CONFIRME' | 'ECHOUE';
  inscription: 'EN_ATTENTE_PAIEMENT' | 'ACTIVE' | 'ANNULEE';
}

// US18 : le prix est lu par le serveur dans la formation, jamais envoyé par le navigateur.
@Injectable({ providedIn: 'root' })
export class PaiementService {
  private readonly api = inject(ApiService);

  creerCheckout(formationId: string) {
    return this.api.post<Checkout>('/api/paiements/checkout', { formationId });
  }

  lireStatut(paiementId: string) {
    return this.api.get<StatutPaiement>(`/api/paiements/${paiementId}/statut`);
  }
}