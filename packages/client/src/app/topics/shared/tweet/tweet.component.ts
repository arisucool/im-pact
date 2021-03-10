import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-tweet',
  templateUrl: './tweet.component.html',
  styleUrls: ['./tweet.component.scss'],
})
export class TweetComponent implements OnInit {
  @Input() tweet: any;
  @Input() mode: any;
  @Output() selectChangedEvent = new EventEmitter<boolean>();
  isSelected = null;

  // ツイートのデータ
  rawData: any;

  ngOnInit(): void {
    if (!this.mode) {
      this.mode = this.tweet.predictedSelect !== undefined ? 'validation' : 'training';
    }

    if (this.mode === 'dashboard') {
      this.isSelected = this.tweet.predictedClass === 'accept' ? true : false;
    } else {
      this.isSelected = this.tweet.selected !== undefined ? this.tweet.selected : false;
    }

    this.rawData = JSON.parse(this.tweet.rawJSONData);
  }

  /**
   * 分類ボタンがクリックされたときに呼び出されるリスナ
   */
  onClassificationButtonClicked() {
    this.isSelected = !this.isSelected;
    this.selectChangedEvent.emit(this.isSelected);
  }
}
