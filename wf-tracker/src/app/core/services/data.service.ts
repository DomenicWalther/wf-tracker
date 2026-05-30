import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { TrackerData } from '../models/tracker.models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly data$ = this.http.get<TrackerData>('assets/tracker-data.json').pipe(shareReplay(1));

  getData(): Observable<TrackerData> {
    return this.data$;
  }
}
