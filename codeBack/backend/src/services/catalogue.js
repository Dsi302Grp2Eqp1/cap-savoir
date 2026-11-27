const { Formation } = require('../models');

const LIMITE_MAX = 50;

// Le texte saisi est cherché tel quel : les caractères spéciaux des expressions
// régulières sont échappés (sinon "(a+)+$" pourrait bloquer la requête).
function echapperRegex(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function rechercher(requete) {
  const filtre = { statut: 'PUBLIEE' };

  if (requete.titre) {
    filtre.titre = { $regex: echapperRegex(String(requete.titre)), $options: 'i' };
  }

  if (requete.categorie) {
    filtre.categories = String(requete.categorie);
  }

  if (requete.prixMin || requete.prixMax) {
    filtre.prix = {};
    if (requete.prixMin) {
      filtre.prix.$gte = Number(requete.prixMin);
    }
    if (requete.prixMax) {
      filtre.prix.$lte = Number(requete.prixMax);
    }
  }

  const page = Math.max(1, Math.floor(Number(requete.page)) || 1);
  const limite = Math.min(LIMITE_MAX, Math.max(1, Math.floor(Number(requete.limit)) || 9));
  const debut = (page - 1) * limite;

  const formations = await Formation.find(filtre)
    .select('-chapitres')
    .sort({ _id: -1 })
    .skip(debut)
    .limit(limite);

  const total = await Formation.countDocuments(filtre);

  return {
    formations,
    page,
    limite,
    total,
    totalPages: Math.ceil(total / limite),
  };
}

async function listerCategories() {
  return Formation.distinct('categories', { statut: 'PUBLIEE' });
}

module.exports = { rechercher, listerCategories };