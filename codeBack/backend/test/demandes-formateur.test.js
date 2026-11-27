// US05 / US06 / US38 / US07 : parcours « devenir formateur ».
// Front-office (API JSON) et back-office agent (EJS) testés par HTTP.
// Les repositories sont simulés en mémoire : aucune base, aucun serveur MongoDB.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { Types } = require('mongoose');
const { Demande } = require('../src/models');
const utilisateurs = require('../src/repositories/utilisateurs');
const demandes = require('../src/repositories/demandes-formateur');
const jeton = require('../src/utils/jeton');
const app = require('../src/app');

const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');

function personne(prenom, roles) {
  return { _id: new Types.ObjectId(), nom: 'Test', prenom, email: `${prenom.toLowerCase()}@exemple.tn`, roles, versionJeton: 0 };
}

test('Demandes formateur : US05, US06, US38, US07', async (t) => {
  const sauvegarde = { ...process.env };
  process.env.JWT_SECRET = 'secret-de-test-uniquement';
  process.env.UPLOAD_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'capsavoir-cv-'));

  const sara = personne('Sara', ['APPRENANT']);
  const karim = personne('Karim', ['APPRENANT']);
  const formateur = personne('Ines', ['APPRENANT', 'FORMATEUR']);
  const agent = { ...personne('Agent', ['AGENT']), motDePasse: await bcrypt.hash('Agent123', 4) };
  const comptes = new Map([sara, karim, formateur, agent].map((u) => [String(u._id), u]));
  const stockees = []; // collection Demande simulée

  t.mock.method(utilisateurs, 'trouverPourSession', async (id) => comptes.get(String(id)) ?? null);
  t.mock.method(utilisateurs, 'trouverParEmailAvecMotDePasse', async (email) =>
    [...comptes.values()].find((u) => u.email === email) ?? null);
  t.mock.method(utilisateurs, 'incrementerVersionJeton', async (id) => { comptes.get(String(id)).versionJeton += 1; });
  t.mock.method(utilisateurs, 'devenirFormateur', async (id, domaine) => {
    const u = comptes.get(String(id));
    if (!u.roles.includes('FORMATEUR')) u.roles.push('FORMATEUR');
    u.domaineExpertise = domaine;
  });

  const memeId = (a, b) => String(a) === String(b);
  t.mock.method(demandes, 'creer', async (donnees) => {
    const doc = new Demande({ ...donnees, type: 'FORMATEUR' });
    await doc.validate(); // le document respecte le schéma Mongoose réel
    stockees.push(doc.toObject());
    return doc.toObject();
  });
  t.mock.method(demandes, 'trouverEnAttente', async (id) =>
    stockees.find((d) => memeId(d.demandeur._id, id) && d.statut === 'EN_ATTENTE') ?? null);
  t.mock.method(demandes, 'listerParDemandeur', async (id) =>
    stockees.filter((d) => memeId(d.demandeur._id, id)).reverse());
  t.mock.method(demandes, 'lister', async (statut) => stockees.filter((d) => !statut || d.statut === statut));
  t.mock.method(demandes, 'trouverParId', async (id) => stockees.find((d) => memeId(d._id, id)) ?? null);
  t.mock.method(demandes, 'enregistrerDecision', async (id, decision) => {
    const d = stockees.find((x) => memeId(x._id, id) && x.statut === 'EN_ATTENTE');
    return d ? Object.assign(d, decision) : null;
  });

  const serveur = app.listen(0, '127.0.0.1');
  await once(serveur, 'listening');
  const base = `http://127.0.0.1:${serveur.address().port}`;

  // --- Aides HTTP ---
  async function api(methode, url, { utilisateur, form, statut = 200 } = {}) {
    const headers = utilisateur ? { Authorization: `Bearer ${jeton.signer(utilisateur)}` } : {};
    const reponse = await fetch(base + url, { method: methode, headers, body: form });
    const texte = await reponse.text();
    assert.equal(reponse.status, statut, `${methode} ${url} : ${texte}`);
    return texte ? JSON.parse(texte) : null;
  }
  function formulaire(champs, cv = PDF, nom = 'cv.pdf') {
    const form = new FormData();
    for (const [cle, valeur] of Object.entries(champs)) form.append(cle, valeur);
    if (cv) form.append('cv', new Blob([cv]), nom);
    return form;
  }
  let cookie = '';
  async function page(methode, url, { body, statut = 200 } = {}) {
    const reponse = await fetch(base + url, {
      method: methode,
      redirect: 'manual',
      headers: {
        Cookie: cookie,
        ...(body && { 'Content-Type': 'application/x-www-form-urlencoded' }),
      },
      body: body && new URLSearchParams(body),
    });
    const texte = await reponse.text();
    assert.equal(reponse.status, statut, `${methode} ${url} : ${texte.slice(0, 300)}`);
    return { reponse, html: texte };
  }

  const candidature = { domaineExpertise: 'Développement web', experience: '5 ans <script>alert(1)</script>' };
  let demandeSara;

  try {
    await t.test('US05 : accès réservé aux apprenants connectés', async () => {
      await api('POST', '/api/demandes-formateur', { form: formulaire(candidature), statut: 401 });
      await api('POST', '/api/demandes-formateur', { utilisateur: agent, form: formulaire(candidature), statut: 403 });
    });

    await t.test('US05 : champs et CV contrôlés', async () => {
      const refus = [
        [formulaire(candidature, null), 'Le CV (PDF) est obligatoire.'],
        [formulaire(candidature, Buffer.from('pas un pdf'), 'cv.pdf'), 'Le CV doit être un fichier PDF.'],
        [formulaire({ ...candidature, domaineExpertise: '  ' }), "Domaine d'expertise invalide (obligatoire, maximum 200 caractères)."],
        [formulaire({ domaineExpertise: 'Web' }), 'Expérience invalide (obligatoire, maximum 3000 caractères).'],
      ];
      for (const [form, message] of refus) {
        const corps = await api('POST', '/api/demandes-formateur', { utilisateur: sara, form, statut: 400 });
        assert.equal(corps.erreur, message);
      }
      assert.equal(stockees.length, 0);
    });

    await t.test('US05 : demande déposée, une seule en attente, pas pour un formateur', async () => {
      demandeSara = await api('POST', '/api/demandes-formateur', { utilisateur: sara, form: formulaire(candidature), statut: 201 });
      assert.equal(demandeSara.statut, 'EN_ATTENTE');
      assert.equal(demandeSara.cv.nom, 'cv.pdf');

      const fichiers = await fs.readdir(path.join(process.env.UPLOAD_DIR, 'cv'));
      assert.equal(fichiers.length, 1, 'CV enregistré dans UPLOAD_DIR/cv');

      const doublon = await api('POST', '/api/demandes-formateur', { utilisateur: sara, form: formulaire(candidature), statut: 409 });
      assert.equal(doublon.erreur, 'Vous avez déjà une demande en attente.');
      const dejaFormateur = await api('POST', '/api/demandes-formateur', { utilisateur: formateur, form: formulaire(candidature), statut: 409 });
      assert.equal(dejaFormateur.erreur, 'Vous êtes déjà formateur.');
    });

    await t.test('US07 : le demandeur voit sa demande en attente, sans données internes', async () => {
      const liste = await api('GET', '/api/demandes-formateur/moi', { utilisateur: sara });
      assert.equal(liste.length, 1);
      assert.equal(liste[0].statut, 'EN_ATTENTE');
      assert.equal(liste[0].agentId, undefined);
      assert.equal(liste[0].cv.url, undefined, 'emplacement du fichier jamais exposé');
      assert.deepEqual(await api('GET', '/api/demandes-formateur/moi', { utilisateur: karim }), []);
    });

    await t.test('Back-office : connexion réservée aux agents', async () => {
      const { reponse } = await page('GET', '/backoffice/demandes', { statut: 302 });
      assert.equal(reponse.headers.get('location'), '/backoffice/connexion');

      const mauvais = await page('POST', '/backoffice/connexion', { body: { email: agent.email, motDePasse: 'faux' }, statut: 401 });
      assert.match(mauvais.html, /Email ou mot de passe incorrect/);

      const ok = await page('POST', '/backoffice/connexion', { body: { email: agent.email, motDePasse: 'Agent123' }, statut: 302 });
      const setCookie = ok.reponse.headers.get('set-cookie');
      assert.match(setCookie, /HttpOnly/);
      assert.match(setCookie, /SameSite=Strict/);
      cookie = setCookie.split(';')[0];
    });

    await t.test('US06 : liste filtrée et détail de la demande', async () => {
      const liste = await page('GET', '/backoffice/demandes');
      assert.match(liste.html, /Sara Test/);
      assert.match(liste.html, /Développement web/);
      const refusees = await page('GET', '/backoffice/demandes?statut=REFUSEE');
      assert.doesNotMatch(refusees.html, /Sara Test/);

      const detail = await page('GET', `/backoffice/demandes/${demandeSara._id}`);
      assert.match(detail.html, /5 ans &lt;script&gt;/, 'texte saisi échappé dans la page');
      assert.doesNotMatch(detail.html, /<script>alert/);

      const cv = await fetch(`${base}/backoffice/demandes/${demandeSara._id}/cv`, { headers: { Cookie: cookie } });
      assert.equal(cv.status, 200);
      assert.equal(cv.headers.get('content-type'), 'application/pdf');
      assert.deepEqual(Buffer.from(await cv.arrayBuffer()), PDF);

      await page('GET', '/backoffice/demandes/pas-un-id', { statut: 404 });
      await page('GET', `/backoffice/demandes/${new Types.ObjectId()}`, { statut: 404 });
    });

    await t.test('US38 : refus sans motif impossible, acceptation donne le rôle formateur', async () => {
      const sansMotif = await page('POST', `/backoffice/demandes/${demandeSara._id}/refuser`, { body: { motif: ' ' }, statut: 400 });
      assert.match(sansMotif.html, /Motif du refus invalide/);

      const { reponse } = await page('POST', `/backoffice/demandes/${demandeSara._id}/accepter`, { statut: 302 });
      assert.equal(reponse.headers.get('location'), `/backoffice/demandes/${demandeSara._id}?ok=acceptee`);
      assert.deepEqual(sara.roles, ['APPRENANT', 'FORMATEUR']);
      assert.equal(sara.domaineExpertise, 'Développement web');
      assert.equal(stockees[0].agentId, agent._id);
      assert.ok(stockees[0].dateDecision);

      const deuxieme = await page('POST', `/backoffice/demandes/${demandeSara._id}/refuser`, { body: { motif: 'Trop tard' }, statut: 409 });
      assert.match(deuxieme.html, /Cette demande a déjà été traitée/);
      assert.equal(stockees[0].statut, 'ACCEPTEE');
    });

    await t.test('US38 / US07 : refus avec motif visible par le demandeur', async () => {
      const demandeKarim = await api('POST', '/api/demandes-formateur', { utilisateur: karim, form: formulaire(candidature), statut: 201 });
      await page('POST', `/backoffice/demandes/${demandeKarim._id}/refuser`, { body: { motif: 'CV incomplet.' }, statut: 302 });
      assert.deepEqual(karim.roles, ['APPRENANT']);

      const [vue] = await api('GET', '/api/demandes-formateur/moi', { utilisateur: karim });
      assert.equal(vue.statut, 'REFUSEE');
      assert.equal(vue.commentaire, 'CV incomplet.');
      assert.ok(vue.dateDecision);

      // Après un refus, une nouvelle demande est possible.
      await api('POST', '/api/demandes-formateur', { utilisateur: karim, form: formulaire(candidature), statut: 201 });
    });

    await t.test('Back-office : déconnexion', async () => {
      const { reponse } = await page('POST', '/backoffice/deconnexion', { statut: 302 });
      assert.equal(reponse.headers.get('location'), '/backoffice/connexion');
      assert.equal(agent.versionJeton, 1, 'jeton invalidé côté serveur');
      await page('GET', '/backoffice/demandes', { statut: 302 });
    });
  } finally {
    serveur.close();
    await fs.rm(process.env.UPLOAD_DIR, { recursive: true, force: true });
    process.env = sauvegarde;
  }
});
