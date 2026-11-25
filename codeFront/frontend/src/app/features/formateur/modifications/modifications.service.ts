import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class ModificationsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private url = 'http://localhost:3000/api/modifications/';

  private entetes() {
    return { Authorization: 'Bearer ' + this.auth.jeton() };
  }

  proposer(formationId: string, donnees: any) {
    return this.http.post<any>(this.url + formationId, donnees, { headers: this.entetes() });
  }

  lister(formationId: string) {
    return this.http.get<any[]>(this.url + formationId, { headers: this.entetes() });
  }
}