import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { QuizService } from '../services/quiz.service';
import { Quiz, ReponseApprenant } from '../models/quiz.model';

/**
 * US23 — Apprenant : passer un quiz.
 * US24 — Redirection vers le résultat après soumission.
 */
@Component({
  selector: 'app-quiz-passage',
  templateUrl: './quiz-passage.html',
  styleUrl: './quiz-passage.css',
})
export class QuizPassage implements OnInit {
  private readonly quizService = inject(QuizService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  quizId = '';
  quiz = signal<Quiz | null>(null);
  reponses = signal<Record<string, string>>({}); // questionId -> propositionId
  charge = signal(false);
  chargement = signal(true);
  erreur = signal('');
  questionCourante = signal(0);

  ngOnInit() {
    this.quizId = this.route.snapshot.params['quizId'];
    void this.chargerQuiz();
  }

  private async chargerQuiz() {
    try {
      const quiz = await firstValueFrom(this.quizService.obtenirQuizPassage(this.quizId));
      this.quiz.set(quiz);
    } catch (err) {
      this.erreur.set(
        err instanceof HttpErrorResponse
          ? err.error?.erreur || 'Quiz introuvable.'
          : 'Erreur de chargement.',
      );
    } finally {
      this.chargement.set(false);
    }
  }

  choisirReponse(questionId: string, propositionId: string) {
    this.reponses.update((r) => ({ ...r, [questionId]: propositionId }));
  }

  reponseChoisie(questionId: string): string {
    return this.reponses()[questionId] || '';
  }

  precedent() {
    if (this.questionCourante() > 0) this.questionCourante.update((n) => n - 1);
  }

  suivant() {
    const quiz = this.quiz();
    if (!quiz) return;
    if (this.questionCourante() < quiz.questions.length - 1) {
      this.questionCourante.update((n) => n + 1);
    }
  }

  get toutesRepondu(): boolean {
    const quiz = this.quiz();
    if (!quiz) return false;
    return quiz.questions.every((q) => !!this.reponses()[q._id]);
  }

  async soumettre() {
    if (this.charge() || !this.toutesRepondu) return;
    this.charge.set(true);
    this.erreur.set('');
    try {
      const reponses: ReponseApprenant[] = Object.entries(this.reponses()).map(
        ([questionId, propositionId]) => ({ questionId, propositionId }),
      );
      const { tentative } = await firstValueFrom(
        this.quizService.soumettreTentative(this.quizId, reponses),
      );
      // US24 : redirection vers le résultat immédiat
      await this.router.navigate(['/apprenant/quiz', this.quizId, 'resultat', tentative._id]);
    } catch (err) {
      this.erreur.set(
        err instanceof HttpErrorResponse
          ? err.error?.erreur || 'Erreur lors de la soumission.'
          : 'Erreur inattendue.',
      );
    } finally {
      this.charge.set(false);
    }
  }
}
