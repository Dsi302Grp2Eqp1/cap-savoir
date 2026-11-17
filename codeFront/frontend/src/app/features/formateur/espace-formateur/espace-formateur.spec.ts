import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { EspaceFormateur } from './espace-formateur';
import { FormationsService } from '../formations/services/formations.service';
import { ChapitresService } from '../chapitres/services/chapitres.service';
import { RessourcesService } from '../ressources/services/ressources.service';
import { FichiersService } from '../shared/services/fichiers.service';
import { Formation } from '../formations/models/formation.model';
import { Fichier } from '../shared/models/fichier.model';

const image: Fichier = {
  nom: 'image.png',
  format: 'image/png',
  taille: 100,
  url: '/api/fichiers/profil/image.png',
};
const formation: Formation = {
  _id: 'formation-1',
  titre: 'Node.js',
  description: 'Apprendre Express',
  categories: ['Web'],
  prix: 0,
  image,
  statut: 'BROUILLON',
  dateCreation: '2026-11-17',
  chapitres: [],
};

describe('Espace formateur', () => {
  let service: Record<string, ReturnType<typeof vi.fn>>;
  beforeEach(async () => {
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:couverture');
        static override revokeObjectURL = vi.fn();
      },
    );
    service = {
      lister: vi.fn(() => of([])),
      creer: vi.fn(() => of(structuredClone(formation))),
      obtenir: vi.fn(() => of(structuredClone(formation))),
      televerser: vi.fn(() => of(image)),
      fichier: vi.fn(() => of(new Blob(['image']))),
      ajouterChapitre: vi.fn(),
      ajouterRessource: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [EspaceFormateur],
      providers: [
        { provide: FormationsService, useValue: service },
        { provide: ChapitresService, useValue: service },
        { provide: RessourcesService, useValue: service },
        { provide: FichiersService, useValue: service },
      ],
    }).compileComponents();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('permet de préparer une formation même quand la base reste non configurée', async () => {
    service['lister'].mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 503, error: { erreur: 'Configurer FORMATEUR_ID.' } }),
      ),
    );
    const fixture = TestBed.createComponent(EspaceFormateur);
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(fixture.componentInstance.charge()).toBe(false));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Configurer FORMATEUR_ID.',
    );
    fixture.componentInstance.nouvelle();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#titre')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('US08 : téléverse la couverture puis crée le brouillon avec les catégories normalisées', async () => {
    const fixture = TestBed.createComponent(EspaceFormateur);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.nouvelle();
    component.formulaire = {
      titre: 'Node.js',
      description: 'Apprendre Express',
      categories: 'Web, JavaScript, ',
      prix: 0,
    };
    component.image = new File(['image'], 'image.png', { type: 'image/png' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('app-formation-formulaire form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(component.selection()?._id).toBe(formation._id));
    await fixture.whenStable();
    expect(service['televerser']).toHaveBeenCalledWith(component.image, 'IMAGE');
    expect(service['creer']).toHaveBeenCalledWith({
      titre: 'Node.js',
      description: 'Apprendre Express',
      categories: ['Web', 'JavaScript'],
      prix: 0,
      image,
    });
    expect(component.selection()?._id).toBe(formation._id);
    expect(fixture.nativeElement.textContent).toContain('Formation créée en brouillon.');
  });

  it('US09 : enregistre le nouveau chapitre et affiche la réponse serveur', async () => {
    const chapitre = {
      _id: 'chapitre-1',
      titre: 'Introduction',
      description: '',
      ordre: 1,
      ressources: [],
    };
    service['ajouterChapitre'].mockReturnValue(of({ ...formation, chapitres: [chapitre] }));
    const fixture = TestBed.createComponent(EspaceFormateur);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    await component.ouvrir(formation._id);
    component.nouveauChapitre = { titre: 'Introduction', description: '' };
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('app-chapitre-formulaire form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(component.selection()?.chapitres.length).toBe(1));
    await fixture.whenStable();
    expect(service['ajouterChapitre']).toHaveBeenCalledWith(formation._id, {
      titre: 'Introduction',
      description: '',
    });
    expect(component.selection()?.chapitres[0].titre).toBe('Introduction');
    expect(component.nouveauChapitre.titre).toBe('');
    expect(fixture.nativeElement.querySelectorAll('.chapter').length).toBe(1);
  });

  it('US10 : transforme un texte saisi en fichier et le rattache au chapitre sélectionné', async () => {
    const chapitre = { _id: 'chapitre-1', titre: 'Introduction', ordre: 1, ressources: [] };
    service['obtenir'].mockReturnValue(of({ ...formation, chapitres: [chapitre] }));
    service['ajouterRessource'].mockReturnValue(
      of({
        ...formation,
        chapitres: [
          {
            ...chapitre,
            ressources: [
              { _id: 'r-1', titre: 'Objectifs', type: 'TEXTE', ordre: 1, contenu: image },
            ],
          },
        ],
      }),
    );
    const fixture = TestBed.createComponent(EspaceFormateur);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    await component.ouvrir(formation._id);
    component.ressources[chapitre._id] = {
      titre: 'Objectifs',
      type: 'TEXTE',
      texte: 'Comprendre Express.',
    };
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('app-ressources-chapitre form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(component.selection()?.chapitres[0].ressources.length).toBe(1));
    await fixture.whenStable();
    expect(service['televerser']).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cours.txt', type: 'text/plain' }),
      'TEXTE',
    );
    expect(service['ajouterRessource']).toHaveBeenCalledWith(formation._id, chapitre._id, {
      titre: 'Objectifs',
      type: 'TEXTE',
      contenu: image,
    });
    expect(fixture.nativeElement.textContent).toContain('Objectifs');
  });

  it('conserve le formulaire et affiche le rejet serveur du fichier', async () => {
    service['televerser'].mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { erreur: 'Format incompatible.' } }),
      ),
    );
    const fixture = TestBed.createComponent(EspaceFormateur);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.nouvelle();
    component.formulaire.titre = 'Mon cours';
    component.image = new File(['x'], 'faux.png');
    await component.creerFormation();
    await fixture.whenStable();
    expect(service['creer']).not.toHaveBeenCalled();
    expect(component.charge()).toBe(false);
    expect(component.formulaire.titre).toBe('Mon cours');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Format incompatible.',
    );
  });
});
