import { Component, OnInit } from '@angular/core';
import { DefaultService } from 'src/.api-client';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  constructor() {}

  async ngOnInit() {
  }
}
