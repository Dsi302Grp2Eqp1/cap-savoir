import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { QuizService } from '../services/quiz.service';
import { QuizFormulaire, QuestionFormulaire, PropositionFormulaire, Quiz } from '../models/quiz.model';

/**
 * US22 — Formateur : créer ou modifier le quiz d'un chapitre.
 * Interface de saisie des questions, propositions et score minimum.
 */
@Component({
  selector: 'app-quiz-editeur',
  imports: [FormsModule],
  templateUrl: './quiz-editeur.html',
  styleUrl: './quiz-editeur.css',
})
export class QuizEditeur implements OnInit {
  private readonly quizService = inject(QuizService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  formationId = '';
  chapitreId = '';

  formulaire: QuizFormulaire = {
    titre: '',
    scoreMinimum: 50,
    questions: [],
  };

  readonly charge = signal(false);
  readonly erreur = signal('');
  readonly message = signal('');
  readonly modeEdition = signal(false);

  ngOnInit() {
    this.formationId = this.route.snapshot.params['formationId'];
    this.chapitreId = this.route.snapshot.params['chapitreId'];
    void this.chargerQuizExistant();
  }

  private async chargerQuizExistant() {
    try {
      const quiz = await firstValueFrom(
        this.quizService.obtenirQuizFormateur(this.formationId, this.chapitreId),
      );
      this.remplirFormulaire(quiz);
      this.modeEdition.set(true);
    } catch {
      // Pas de quiz existant : mode création
      this.ajouterQuestion();
    }
  }

  private remplirFormulaire(quiz: Quiz) {
    this.formulaire = {
      titre: quiz.titre,
      scoreMinimum: quiz.scoreMinimum,
      questions: quiz.questions.map((q) => ({
        enonce: q.enonce,
        points: q.points,
        explication: q.explication || '',
        propositions: q.propositions.map((p) => ({
          texte: p.texte,
          estCorrecte: p.estCorrecte ?? false,
        })),
      })),
    };
  }

  ajouterQuestion() {
    const nouvelleQuestion: QuestionFormulaire = {
      enonce: '',
      points: 1,
      explication: '',
      propositions: [
        { texte: '', estCorrecte: true },
        { texte: '', estCorrecte: false },
      ],
    };
    this.formulaire.questions.push(nouvelleQuestion);
  }

  supprimerQuestion(index: number) {
    this.formulaire.questions.splice(index, 1);
  }

  ajouterProposition(question: QuestionFormulaire) {
    question.propositions.push({ texte: '', estCorrecte: false });
  }

  supprimerProposition(question: QuestionFormulaire, index: number) {
    if (question.propositions.length <= 2) return;
    question.propositions.splice(index, 1);
    // S'assurer qu'il y a toujours exactement une bonne réponse
    if (!question.propositions.some((p) => p.estCorrecte)) {
      question.propositions[0].estCorrecte = true;
    }
  }

  definirBonneReponse(question: QuestionFormulaire, index: number) {
    question.propositions.forEach((p, i) => {
      p.estCorrecte = i === index;
    });
  }

  async enregistrer() {
    if (this.charge()) return;
    this.charge.set(true);
    this.erreur.set('');
    this.message.set('');
    try {
      await firstValueFrom(
        this.quizService.enregistrerQuiz(this.formationId, this.chapitreId, this.formulaire),
      );
      this.message.set('Quiz enregistré avec succès.');
      this.modeEdition.set(true);
    } catch (err) {
      this.erreur.set(
        err instanceof HttpErrorResponse
          ? err.error?.erreur || "Erreur lors de l'enregistrement."
          : 'Erreur inattendue.',
      );
    } finally {
      this.charge.set(false);
    }
  }

  retour() {
    void this.router.navigate(['/formateur']);
  }
}
