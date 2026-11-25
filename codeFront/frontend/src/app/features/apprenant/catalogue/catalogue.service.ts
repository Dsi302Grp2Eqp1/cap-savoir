import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private http = inject(HttpClient);
  private url = 'http://localhost:3000/api/catalogue';

  rechercher(filtres: any) {
    let params = new HttpParams();
    for (const cle of Object.keys(filtres)) {
      if (filtres[cle] !== '' && filtres[cle] !== null && filtres[cle] !== undefined) {
        params = params.set(cle, filtres[cle]);
      }
    }
    return this.http.get<any>(this.url, { params });
  }

  listerCategories() {
    return this.http.get<string[]>(this.url + '/categories');
  }
}