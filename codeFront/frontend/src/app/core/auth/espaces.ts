import { Role } from './auth.model';

// US03 : un espace par rôle. L'ordre définit l'espace ouvert après connexion
// quand un utilisateur possède plusieurs rôles.
export const ESPACES: { role: Role; chemin: string; libelle: string }[] = [
  { role: 'AGENT', chemin: '/agent', libelle: 'Espace agent' },
  { role: 'FORMATEUR', chemin: '/formateur', libelle: 'Espace formateur' },
  { role: 'APPRENANT', chemin: '/apprenant', libelle: 'Espace apprenant' },
];

// Règles identiques à celles du backend (utils/mot-de-passe.js).
export const MOT_DE_PASSE_MIN = 8;
export function motDePasseValide(valeur: string): boolean {
  return valeur.length >= MOT_DE_PASSE_MIN && /[A-Za-z]/.test(valeur) && /\d/.test(valeur);
}
