const { Formation } = require('../models');

async function rechercher(requete) {
  const filtre = { statut: 'PUBLIEE' };

  if (requete.titre) {
    filtre.titre = { $regex: requete.titre, $options: 'i' };
  }

  if (requete.categorie) {
    filtre.categories = requete.categorie;
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

  const page = Number(requete.page) || 1;
  const limite = Number(requete.limit) || 9;
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