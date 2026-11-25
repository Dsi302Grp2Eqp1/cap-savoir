import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class InscriptionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private url = 'http://localhost:3000/api/inscriptions';

  inscrire(formationId: string) {
    const headers = { Authorization: 'Bearer ' + this.auth.jeton() };
    return this.http.post<any>(this.url, { formationId: formationId }, { headers: headers });
  }
}