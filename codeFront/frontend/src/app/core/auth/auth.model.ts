export type Role = 'APPRENANT' | 'FORMATEUR' | 'AGENT';

export interface Utilisateur {
  _id: string;
  nom: string;
  prenom: string;
  email: string;
  roles: Role[];
  dateCreation: string;
}

export interface Session {
  jeton: string;
  utilisateur: Utilisateur;
}

export interface DonneesInscription {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
}
