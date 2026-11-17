const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const ErreurApi = require('../utils/erreur-api');

// Types de fichiers autorisés pour les ressources et la couverture.
const formats = {
  IMAGE: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
  PDF: ['application/pdf'],
  DOCUMENT: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
  ],
  PRESENTATION: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
  ],
  TEXTE: ['text/plain'],
};

function obtenirRepertoire() {
  const dossier = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
  return path.resolve(dossier);
}

function verifierType(type, mime) {
  if (!Object.hasOwn(formats, type) || !formats[type].includes(mime)) {
    throw new ErreurApi(400, 'Format de fichier incompatible avec le type choisi.');
  }
}

function verifierTexteUtf8(buffer) {
  let texte;
  try {
    texte = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new ErreurApi(400, 'Le texte doit être encodé en UTF-8.');
  }

  // Un texte peut contenir des sauts de ligne et des tabulations,
  // mais pas les caractères de contrôle d'un fichier binaire.
  const caracteresInterdits = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
  if (!texte.trim() || caracteresInterdits.test(texte)) {
    throw new ErreurApi(400, 'Texte invalide.');
  }
}

async function detecterFormat(buffer, type) {
  // file-type utilise les modules ESM : on le charge avec import().
  const { fileTypeFromBuffer } = await import('file-type');
  let detection;
  try {
    detection = await fileTypeFromBuffer(buffer);
  } catch {
    throw new ErreurApi(400, 'Fichier invalide ou incomplet.');
  }

  // Le texte brut n'a pas de signature binaire reconnue par file-type.
  if (type === 'TEXTE' && !detection) {
    verifierTexteUtf8(buffer);
    detection = { mime: 'text/plain', ext: 'txt' };
  }
  verifierType(type, detection?.mime);
  return detection;
}

async function enregistrer(utilisateurId, type, fichier) {
  if (!fichier?.buffer?.length) {
    throw new ErreurApi(400, 'Un fichier non vide est obligatoire.');
  }
  if (!Object.hasOwn(formats, type)) {
    throw new ErreurApi(400, 'Type de ressource invalide.');
  }

  const format = await detecterFormat(fichier.buffer, type);
  const id = `${randomUUID()}.${format.ext}`;
  const dossier = path.join(obtenirRepertoire(), String(utilisateurId));
  const cheminFichier = path.join(dossier, id);
  const nomOriginal = fichier.originalname.replaceAll('\\', '/');

  await fs.mkdir(dossier, { recursive: true });
  const metadata = {
    nom: path.basename(nomOriginal).slice(0, 200),
    format: format.mime,
    taille: fichier.size,
    url: `/api/fichiers/${utilisateurId}/${id}`,
  };
  // Le contenu et ses métadonnées sont stockés séparément.
  // Le flag wx empêche d'écraser un fichier déjà présent.
  await fs.writeFile(cheminFichier, fichier.buffer, { flag: 'wx' });
  await fs.writeFile(`${cheminFichier}.json`, JSON.stringify(metadata), { flag: 'wx' });
  return metadata;
}

async function retrouver(utilisateurId, url, type) {
  const prefixe = `/api/fichiers/${utilisateurId}/`;
  if (typeof url !== 'string' || !url.startsWith(prefixe)) {
    throw new ErreurApi(400, 'Téléversez un fichier avec votre compte.');
  }

  const id = url.slice(prefixe.length);
  const identifiantValide = /^[a-f0-9-]{36}\.[a-z0-9]+$/;
  if (!identifiantValide.test(id)) {
    throw new ErreurApi(400, 'Référence de fichier invalide.');
  }

  const chemin = path.join(obtenirRepertoire(), String(utilisateurId), id);
  try {
    const metadata = JSON.parse(await fs.readFile(`${chemin}.json`, 'utf8'));
    await fs.access(chemin);
    if (type) {
      verifierType(type, metadata.format);
    }
    return { chemin, metadata };
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new ErreurApi(404, 'Fichier introuvable.');
    }
    throw err;
  }
}

module.exports = { enregistrer, retrouver, formats };
