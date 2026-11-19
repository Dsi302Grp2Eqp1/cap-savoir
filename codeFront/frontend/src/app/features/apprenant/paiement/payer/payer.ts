import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { messageErreur } from '../../../auth/erreur-api';
import { PaiementService } from '../paiement.service';

// US18 : l'apprenant lance le paiement ; le prix est lu par le serveur, pas par le navigateur.
@Component({
  selector: 'app-payer',
  templateUrl: './payer.html',
  styleUrl: './payer.css',
})
export class Payer {
  private readonly paiement = inject(PaiementService);
  private readonly route = inject(ActivatedRoute);

  readonly formationId = this.route.snapshot.paramMap.get('formationId') ?? '';
  readonly charge = signal(false);
  readonly erreur = signal('');

  async payer() {
    if (this.charge()) return;
    this.erreur.set('');
    this.charge.set(true);
    try {
      const { url } = await firstValueFrom(this.paiement.creerCheckout(this.formationId));
      sessionStorage.setItem('paiement.formationId', this.formationId);
      window.location.assign(url); // page de paiement hébergée par la passerelle
    } catch (err) {
      this.erreur.set(messageErreur(err));
      this.charge.set(false);
    }
  }
}