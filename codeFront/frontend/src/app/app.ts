import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/api.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly title = signal('Cap Savoir');
  protected readonly apiStatus = signal<'checking' | 'online' | 'offline'>('checking');

  ngOnInit(): void {
    this.api.health().subscribe({
      next: () => this.apiStatus.set('online'),
      error: () => this.apiStatus.set('offline'),
    });
  }
}
