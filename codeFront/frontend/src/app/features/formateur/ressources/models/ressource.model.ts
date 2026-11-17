import { Fichier } from '../../shared/models/fichier.model';
export type TypeRessource = 'VIDEO' | 'PDF' | 'DOCUMENT' | 'TEXTE' | 'IMAGE' | 'PRESENTATION';
export interface Ressource {
  _id: string;
  titre: string;
  type: TypeRessource;
  contenu: Fichier;
  ordre: number;
}
export interface BrouillonRessource {
  titre: string;
  type: TypeRessource;
  texte: string;
  fichier?: File;
}
export interface DeplacementRessource {
  index: number;
  direction: number;
}
