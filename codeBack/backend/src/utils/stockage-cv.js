// US05 : stockage des CV des demandes formateur (PDF uniquement).
// Les fichiers sont rangés dans UPLOAD_DIR/cv et ne sont jamais servis en accès
// public : seul le back-office agent les lit (US06).
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const ErreurApi = require('./erreur-api');

const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo
const FORMAT = 'application/pdf';

function dossier() {
  const racine = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
  return path.resolve(racine, 'cv');
}

// Le type est vérifié sur le contenu (signature %PDF), pas sur l'extension.
async function estPdf(buffer) {
  const { fileTypeFromBuffer } = await import('file-type');
  try {
    return (await fileTypeFromBuffer(buffer))?.mime === FORMAT;
  } catch {
    return false;
  }
}

// Renvoie le sous-document Fichier à enregistrer dans la demande.
async function enregistrer(fichier) {
  if (!fichier?.buffer?.length) throw new ErreurApi(400, 'Le CV (PDF) est obligatoire.');
  if (fichier.buffer.length > TAILLE_MAX) throw new ErreurApi(413, 'CV trop volumineux (maximum 5 Mo).');
  if (!(await estPdf(fichier.buffer))) throw new ErreurApi(400, 'Le CV doit être un fichier PDF.');

  const nomStocke = `${randomUUID()}.pdf`;
  await fs.mkdir(dossier(), { recursive: true });
  await fs.writeFile(path.join(dossier(), nomStocke), fichier.buffer);

  return {
    nom: path.basename(fichier.originalname || 'cv.pdf').slice(0, 200),
    format: FORMAT,
    taille: fichier.buffer.length,
    url: nomStocke, // nom du fichier dans UPLOAD_DIR/cv
  };
}

// Chemin absolu d'un CV enregistré ; refuse tout nom qui sortirait du dossier.
function chemin(url) {
  const nom = path.basename(String(url));
  if (nom !== url) throw new ErreurApi(404, 'CV introuvable.');
  return path.join(dossier(), nom);
}

async function supprimer(url) {
  await fs.rm(chemin(url), { force: true });
}

module.exports = { enregistrer, chemin, supprimer, TAILLE_MAX };
