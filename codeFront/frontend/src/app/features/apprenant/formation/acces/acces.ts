import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { messageErreur } from '../../../auth/erreur-api';
import { ContenuFormation, ContenuService } from '../contenu.service';

// US19 : l'apprenant qui a payé voit le contenu de sa formation.
@Component({
  selector: 'app-acces-formation',
  imports: [RouterLink],
  templateUrl: './acces.html',
  styleUrl: './acces.css',
})
export class Acces implements OnInit {
  private readonly contenuService = inject(ContenuService);
  private readonly route = inject(ActivatedRoute);

  readonly formationId = this.route.snapshot.paramMap.get('formationId') ?? '';
  readonly contenu = signal<ContenuFormation | null>(null);
  readonly erreur = signal('');
  readonly charge = signal(true);

  ngOnInit() {
    void this.charger();
  }

  async charger() {
    this.erreur.set('');
    this.charge.set(true);
    try {
      this.contenu.set(await firstValueFrom(this.contenuService.lireContenu(this.formationId)));
    } catch (err) {
      this.erreur.set(messageErreur(err));
    } finally {
      this.charge.set(false);
    }
  }
}
