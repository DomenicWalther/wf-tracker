import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly data$ = this.http.get<any>('assets/tracker-data.json').pipe(shareReplay(1));

  getData(): Observable<any> {
    return this.data$;
  }
}
