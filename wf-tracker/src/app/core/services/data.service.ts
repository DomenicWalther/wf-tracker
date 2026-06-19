import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { TrackerData } from '../models/tracker.models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  readonly data = toSignal(this.http.get<TrackerData>('assets/tracker-data.json'));
}
