import { Ressource } from '../../ressources/models/ressource.model';
export interface Chapitre {
  _id: string;
  titre: string;
  description?: string;
  ordre: number;
  ressources: Ressource[];
}
export interface BrouillonChapitre {
  titre: string;
  description: string;
}
