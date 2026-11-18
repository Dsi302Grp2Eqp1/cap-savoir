import { Fichier } from '../../shared/models/fichier.model';
import { Chapitre } from '../../chapitres/models/chapitre.model';
export interface Formation {
  _id: string;
  titre: string;
  description: string;
  categories: string[];
  prix: number;
  image: Fichier;
  statut: 'BROUILLON' | 'SOUMISE' | 'PUBLIEE' | 'ARCHIVEE';
  chapitres: Chapitre[];
  dateCreation: string;
}
export interface NouvelleFormation {
  titre: string;
  description: string;
  categories: string[];
  prix: number;
  image: Fichier;
}
export interface FormulaireFormation {
  titre: string;
  description: string;
  categories: string;
  prix: number;
}
