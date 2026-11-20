import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { messageErreur } from '../../../auth/erreur-api';
import { PaiementService, StatutPaiement } from '../paiement.service';

// US18 : page où la passerelle ramène l'apprenant après le paiement (?ref=<paiementId>).
@Component({
  selector: 'app-resultat-paiement',
  imports: [RouterLink],
  templateUrl: './resultat.html',
  styleUrl: './resultat.css',
})
export class Resultat implements OnInit {
  private readonly paiement = inject(PaiementService);
  private readonly route = inject(ActivatedRoute);

  readonly ref = this.route.snapshot.queryParamMap.get('ref') ?? '';
  readonly formationId = sessionStorage.getItem('paiement.formationId') ?? '';
  readonly statut = signal<StatutPaiement | null>(null);
  readonly erreur = signal('');
  readonly charge = signal(true);

  ngOnInit() {
    void this.verifier();
  }

  // Le serveur interroge la passerelle : l'état affiché ne vient jamais de l'URL.
  async verifier() {
    this.erreur.set('');
    this.charge.set(true);
    try {
      this.statut.set(await firstValueFrom(this.paiement.lireStatut(this.ref)));
    } catch (err) {
      this.erreur.set(messageErreur(err));
    } finally {
      this.charge.set(false);
    }
  }
}