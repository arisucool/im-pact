import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';

/**
 * ライセンス情報のコンポーネント
 */
@Component({
  selector: 'app-license',
  templateUrl: './license.component.html',
  styleUrls: ['./license.component.scss'],
})
export class LicenseComponent implements OnInit {
  public frontendLicenses$: Observable<string>;

  constructor(private http: HttpClient, private location: Location) {}

  ngOnInit(): void {
    this.frontendLicenses$ = this.http.get(`/3rdpartylicenses.txt`, {
      responseType: 'text',
    });
  }
}
