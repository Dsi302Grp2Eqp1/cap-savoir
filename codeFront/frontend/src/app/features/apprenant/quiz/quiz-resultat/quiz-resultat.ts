import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { QuizService } from '../services/quiz.service';
import { Tentative } from '../models/quiz.model';

/**
 * US24 — Résultat immédiat après soumission du quiz.
 */
@Component({
  selector: 'app-quiz-resultat',
  templateUrl: './quiz-resultat.html',
  styleUrl: './quiz-resultat.css',
})
export class QuizResultat implements OnInit {
  private readonly quizService = inject(QuizService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  tentativeId = '';
  quizId = '';
  resultat = signal<{ tentative: Tentative; quiz: { _id: string; titre: string; scoreMinimum: number } } | null>(null);
  charge = signal(true);
  erreur = signal('');

  ngOnInit() {
    this.tentativeId = this.route.snapshot.params['tentativeId'];
    this.quizId = this.route.snapshot.params['quizId'];
    void this.charger();
  }

  private async charger() {
    try {
      const data = await firstValueFrom(this.quizService.obtenirResultat(this.tentativeId));
      this.resultat.set(data);
    } catch (err) {
      this.erreur.set(
        err instanceof HttpErrorResponse
          ? err.error?.erreur || 'Erreur de chargement.'
          : 'Erreur inattendue.',
      );
    } finally {
      this.charge.set(false);
    }
  }

  repasser() {
    void this.router.navigate(['/apprenant/quiz', this.quizId, 'passer']);
  }

  retourEspace() {
    void this.router.navigate(['/apprenant']);
  }
}
