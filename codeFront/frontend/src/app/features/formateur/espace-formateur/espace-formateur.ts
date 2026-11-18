import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FormationsService } from '../formations/services/formations.service';
import { ChapitresService } from '../chapitres/services/chapitres.service';
import { RessourcesService } from '../ressources/services/ressources.service';
import { FichiersService } from '../shared/services/fichiers.service';
import { ListeFormations } from '../formations/liste-formations/liste-formations';
import { FormationFormulaire } from '../formations/formation-formulaire/formation-formulaire';
import { FormationResume } from '../formations/formation-resume/formation-resume';
import { ChapitreEditeur } from '../chapitres/chapitre-editeur/chapitre-editeur';
import { ChapitreFormulaire } from '../chapitres/chapitre-formulaire/chapitre-formulaire';
import { RessourcesChapitre } from '../ressources/ressources-chapitre/ressources-chapitre';
import { Formation, FormulaireFormation } from '../formations/models/formation.model';
import { Chapitre, BrouillonChapitre } from '../chapitres/models/chapitre.model';
import { Ressource, BrouillonRessource } from '../ressources/models/ressource.model';

@Component({
  selector: 'app-espace-formateur',
  imports: [
    ListeFormations,
    FormationFormulaire,
    FormationResume,
    ChapitreEditeur,
    ChapitreFormulaire,
    RessourcesChapitre,
  ],
  templateUrl: './espace-formateur.html',
  styleUrl: './espace-formateur.css',
})
export class EspaceFormateur implements OnInit, OnDestroy {
  private readonly formationsService = inject(FormationsService);
  private readonly chapitresService = inject(ChapitresService);
  private readonly ressourcesService = inject(RessourcesService);
  private readonly fichiersService = inject(FichiersService);
  readonly formations = signal<Formation[]>([]);
  readonly selection = signal<Formation | null>(null);
  readonly creation = signal(false);
  readonly charge = signal(false);
  readonly erreur = signal('');
  readonly message = signal('');
  readonly couverture = signal('');
  formulaire: FormulaireFormation = { titre: '', description: '', categories: '', prix: 0 };
  image?: File;
  nouveauChapitre: BrouillonChapitre = { titre: '', description: '' };
  chapitres: Record<string, BrouillonChapitre> = {};
  ressources: Record<string, BrouillonRessource> = {};
  readonly fichiersReinitialises = signal(0);

  ngOnInit() {
    void this.actualiser();
  }
  ngOnDestroy() {
    this.libererCouverture();
  }
  private libererCouverture() {
    if (this.couverture()) URL.revokeObjectURL(this.couverture());
    this.couverture.set('');
  }
  private async executer(action: () => Promise<void>, message = '') {
    if (this.charge()) return;
    this.charge.set(true);
    this.erreur.set('');
    this.message.set('');
    try {
      await action();
      this.message.set(message);
    } catch (err) {
      this.erreur.set(
        err instanceof HttpErrorResponse
          ? err.status === 0
            ? 'API inaccessible. Vérifiez que le serveur Node.js est démarré.'
            : err.error?.erreur || 'Une erreur est survenue.'
          : err instanceof Error
            ? err.message
            : 'Une erreur est survenue.',
      );
    } finally {
      this.charge.set(false);
    }
  }
  async actualiser() {
    await this.executer(async () => {
      this.formations.set(await firstValueFrom(this.formationsService.lister()));
    });
  }
  nouvelle() {
    this.creation.set(true);
    this.selection.set(null);
    this.libererCouverture();
    this.formulaire = { titre: '', description: '', categories: '', prix: 0 };
    this.image = undefined;
    this.erreur.set('');
    this.message.set('');
  }
  private afficher(formation: Formation) {
    this.selection.set(formation);
    this.creation.set(false);
    this.chapitres = {};
    this.ressources = {};
    formation.chapitres.forEach((c) => {
      this.chapitres[c._id] = { titre: c.titre, description: c.description || '' };
      this.ressources[c._id] = { titre: '', type: 'PDF', texte: '' };
    });
    this.fichiersReinitialises.update((n) => n + 1);
  }
  async ouvrir(id: string) {
    await this.executer(async () => {
      const formation = await firstValueFrom(this.formationsService.obtenir(id));
      this.afficher(formation);
      this.nouveauChapitre = { titre: '', description: '' };
      this.libererCouverture();
      try {
        this.couverture.set(
          URL.createObjectURL(
            await firstValueFrom(this.fichiersService.fichier(formation.image.url)),
          ),
        );
      } catch {
        /* Une couverture indisponible ne masque pas les chapitres. */
      }
    });
  }
  choisirImage(event: Event) {
    this.image = this.fichierChoisi(event);
  }
  choisirRessource(id: string, event: Event) {
    this.ressources[id].fichier = this.fichierChoisi(event);
  }
  private fichierChoisi(event: Event): File | undefined {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (fichier && (fichier.size > 50 * 1024 * 1024 || fichier.size === 0)) {
      this.erreur.set('Choisissez un fichier non vide de 50 Mo maximum.');
      input.value = '';
      return undefined;
    }
    this.erreur.set('');
    return fichier;
  }
  async creerFormation() {
    await this.executer(async () => {
      if (!this.image) throw new Error('Choisissez une image de couverture.');
      const image = await firstValueFrom(this.fichiersService.televerser(this.image, 'IMAGE'));
      const formation = await firstValueFrom(
        this.formationsService.creer({
          ...this.formulaire,
          categories: this.formulaire.categories
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean),
          image,
        }),
      );
      this.formations.update((f) => [formation, ...f]);
      this.afficher(formation);
      this.libererCouverture();
      this.couverture.set(URL.createObjectURL(this.image));
    }, 'Formation créée en brouillon. Ajoutez vos chapitres.');
  }
  async ajouterChapitre() {
    const formation = this.selection();
    if (!formation) return;
    await this.executer(async () => {
      this.afficher(
        await firstValueFrom(
          this.chapitresService.ajouterChapitre(formation._id, this.nouveauChapitre),
        ),
      );
      this.nouveauChapitre = { titre: '', description: '' };
    }, 'Chapitre ajouté.');
  }
  async enregistrerChapitre(chapitre: Chapitre) {
    const formation = this.selection();
    if (!formation) return;
    await this.executer(async () => {
      this.afficher(
        await firstValueFrom(
          this.chapitresService.modifierChapitre(
            formation._id,
            chapitre._id,
            this.chapitres[chapitre._id],
          ),
        ),
      );
    }, 'Chapitre enregistré.');
  }
  async supprimerChapitre(chapitre: Chapitre) {
    const formation = this.selection();
    if (!formation || !window.confirm(`Supprimer « ${chapitre.titre} » et ses ressources ?`))
      return;
    await this.executer(async () => {
      this.afficher(
        await firstValueFrom(this.chapitresService.supprimerChapitre(formation._id, chapitre._id)),
      );
    }, 'Chapitre supprimé.');
  }
  private deplacer<T extends { _id: string }>(items: T[], index: number, direction: number) {
    const ids = items.map((c) => c._id);
    const cible = index + direction;
    if (cible < 0 || cible >= ids.length) return null;
    [ids[index], ids[cible]] = [ids[cible], ids[index]];
    return ids;
  }
  async deplacerChapitre(index: number, direction: number) {
    const formation = this.selection();
    if (!formation) return;
    const ids = this.deplacer(formation.chapitres, index, direction);
    if (!ids) return;
    await this.executer(async () => {
      this.afficher(
        await firstValueFrom(this.chapitresService.ordonnerChapitres(formation._id, ids)),
      );
    }, 'Ordre des chapitres enregistré.');
  }
  async ajouterRessource(chapitre: Chapitre) {
    const formation = this.selection();
    if (!formation) return;
    await this.executer(async () => {
      const brouillon = this.ressources[chapitre._id];
      const fichier =
        brouillon.type === 'TEXTE'
          ? new File([brouillon.texte], 'cours.txt', { type: 'text/plain' })
          : brouillon.fichier;
      if (!fichier) throw new Error('Choisissez un fichier.');
      if (brouillon.type === 'TEXTE' && !brouillon.texte.trim())
        throw new Error('Saisissez le contenu du texte.');
      const contenu = await firstValueFrom(
        this.fichiersService.televerser(fichier, brouillon.type),
      );
      this.afficher(
        await firstValueFrom(
          this.ressourcesService.ajouterRessource(formation._id, chapitre._id, {
            titre: brouillon.titre,
            type: brouillon.type,
            contenu,
          }),
        ),
      );
    }, 'Ressource ajoutée.');
  }
  async supprimerRessource(chapitre: Chapitre, ressource: Ressource) {
    const formation = this.selection();
    if (!formation || !window.confirm(`Retirer la ressource « ${ressource.titre} » ?`)) return;
    await this.executer(async () => {
      this.afficher(
        await firstValueFrom(
          this.ressourcesService.supprimerRessource(formation._id, chapitre._id, ressource._id),
        ),
      );
    }, 'Ressource retirée.');
  }
  async deplacerRessource(chapitre: Chapitre, index: number, direction: number) {
    const formation = this.selection();
    if (!formation) return;
    const ids = this.deplacer(chapitre.ressources, index, direction);
    if (!ids) return;
    await this.executer(async () => {
      this.afficher(
        await firstValueFrom(
          this.ressourcesService.ordonnerRessources(formation._id, chapitre._id, ids),
        ),
      );
    }, 'Ordre des ressources enregistré.');
  }
  async telecharger(ressource: Ressource) {
    await this.executer(async () => {
      const url = URL.createObjectURL(
        await firstValueFrom(this.fichiersService.fichier(ressource.contenu.url)),
      );
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = ressource.contenu.nom;
      document.body.append(lien);
      lien.click();
      lien.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
}
