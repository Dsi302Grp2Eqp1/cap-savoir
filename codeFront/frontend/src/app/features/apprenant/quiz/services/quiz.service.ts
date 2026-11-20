import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api.service';
import {
  Quiz,
  QuizFormulaire,
  ReponseApprenant,
  Tentative,
} from '../models/quiz.model';

/** Service Quiz — US22 (Création), US23 (Passage), US24 (Correction & Score) */
@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly api = inject(ApiService);

  // ─── US22 : Formateur — Création / Consultation ─────────────────────────────

  /** Créer ou modifier le quiz d'un chapitre (formateur). */
  enregistrerQuiz(formationId: string, chapitreId: string, data: QuizFormulaire): Observable<Quiz> {
    return this.api.put<Quiz>(
      `/api/formations/${formationId}/chapitres/${chapitreId}/quiz`,
      data,
    );
  }

  /** Lire le quiz d'un chapitre (formateur). */
  obtenirQuizFormateur(formationId: string, chapitreId: string): Observable<Quiz> {
    return this.api.get<Quiz>(
      `/api/formations/${formationId}/chapitres/${chapitreId}/quiz`,
    );
  }

  // ─── US23 : Apprenant — Passer un quiz ──────────────────────────────────────

  /** Obtenir le quiz pour le passage (bonnes réponses masquées côté API). */
  obtenirQuizPassage(quizId: string): Observable<Quiz> {
    return this.api.get<Quiz>(`/api/quiz/${quizId}/passer`);
  }

  // ─── US24 : Apprenant — Soumettre une tentative et recevoir le score ────────

  /** Soumettre une tentative (correction automatique et enregistrement du score). */
  soumettreTentative(
    quizId: string,
    reponses: ReponseApprenant[],
  ): Observable<{ tentative: Tentative; quiz: { _id: string; titre: string; scoreMinimum: number } }> {
    return this.api.post(`/api/quiz/${quizId}/tentatives`, { reponses });
  }

  /** Obtenir le résultat d'une tentative (US24). */
  obtenirResultat(tentativeId: string): Observable<{ tentative: Tentative; quiz: { _id: string; titre: string; scoreMinimum: number } }> {
    return this.api.get(`/api/tentatives/${tentativeId}/resultat`);
  }
}
