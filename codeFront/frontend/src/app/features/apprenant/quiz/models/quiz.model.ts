// Modèles TypeScript pour le module Quiz — US22, US23, US24
export interface Proposition {
  _id: string;
  texte: string;
  estCorrecte?: boolean; // absent lors du passage (masqué côté API)
}

export interface Question {
  _id: string;
  enonce: string;
  points: number;
  explication?: string;
  propositions: Proposition[];
}

export interface Quiz {
  _id: string;
  titre: string;
  scoreMinimum: number;
  formationId: string;
  chapitreId: string;
  questions: Question[];
}

// Réponse apprenant lors du passage (US23)
export interface ReponseApprenant {
  questionId: string;
  propositionId: string;
}

// Résultat d'une tentative (US24)
export interface Tentative {
  _id: string;
  numeroTentative: number;
  score: number;
  valide: boolean;
  dateDebut: string;
  dateFin: string;
}

// Formulaire de création quiz (US22)
export interface PropositionFormulaire {
  texte: string;
  estCorrecte: boolean;
}

export interface QuestionFormulaire {
  enonce: string;
  points: number;
  explication: string;
  propositions: PropositionFormulaire[];
}

export interface QuizFormulaire {
  titre: string;
  scoreMinimum: number;
  questions: QuestionFormulaire[];
}
