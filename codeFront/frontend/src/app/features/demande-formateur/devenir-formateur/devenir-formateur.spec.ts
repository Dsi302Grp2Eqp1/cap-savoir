import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { DemandeFormateur } from '../demande-formateur.service';
import { DevenirFormateur } from './devenir-formateur';

const url = `${environment.apiUrl}/api/demandes-formateur`;
const refusee: DemandeFormateur = {
  _id: 'd1',
  statut: 'REFUSEE',
  dateSoumission: '2026-11-20T10:00:00.000Z',
  dateDecision: '2026-11-21T10:00:00.000Z',
  commentaire: 'CV incomplet.',
  domaineExpertise: 'Développement web',
  experience: '5 ans',
  cv: { nom: 'cv.pdf' },
};

describe('DevenirFormateur (US05/US07)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DevenirFormateur],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function afficher(demandes: DemandeFormateur[]) {
    const fixture = TestBed.createComponent(DevenirFormateur);
    fixture.detectChanges();
    http.expectOne(`${url}/moi`).flush(demandes);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('US07 : affiche le statut et le motif du refus, et permet une nouvelle demande', async () => {
    const fixture = await afficher([refusee]);
    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Refusée');
    expect(texte).toContain('Motif : CV incomplet.');
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('US05 : masque le formulaire tant qu\'une demande est en attente', async () => {
    const fixture = await afficher([{ ...refusee, statut: 'EN_ATTENTE', dateDecision: null, commentaire: null }]);
    expect(fixture.nativeElement.textContent).toContain('En attente');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('US05 : envoie le formulaire en multipart avec le CV', async () => {
    const fixture = await afficher([]);
    const page = fixture.componentInstance;
    page.domaineExpertise = ' Développement web ';
    page.experience = '5 ans';
    const cv = new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' });
    page.choisirCv({ target: { files: [cv] } } as unknown as Event);

    const envoi = page.envoyer();
    const requete = http.expectOne(url);
    expect(requete.request.method).toBe('POST');
    const corps = requete.request.body as FormData;
    expect(corps.get('domaineExpertise')).toBe('Développement web');
    expect((corps.get('cv') as File).name).toBe('cv.pdf');
    requete.flush({ ...refusee, statut: 'EN_ATTENTE' });
    await Promise.resolve();
    http.expectOne(`${url}/moi`).flush([{ ...refusee, statut: 'EN_ATTENTE' }]);
    await envoi;
    expect(page.succes()).toContain('Demande envoyée');
    expect(page.enAttente()).toBe(true);
  });

  it('US05 : refuse un CV qui n\'est pas un PDF', async () => {
    const fixture = await afficher([]);
    const page = fixture.componentInstance;
    const image = new File(['x'], 'photo.png', { type: 'image/png' });
    page.choisirCv({ target: { files: [image] } } as unknown as Event);
    await page.envoyer();
    expect(page.erreurCv).toBe('Choisissez un fichier PDF.');
  });
});
