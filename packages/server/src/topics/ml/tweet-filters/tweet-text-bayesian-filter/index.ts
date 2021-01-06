import { CrawledTweet } from '../../entities/crawled-tweet.entity';
import { TweetFilter } from '../interfaces/tweet-filter.interface';
import * as TinySegmenter from 'tiny-segmenter';
import * as Bayes from 'bayes';
import { ModuleStorage } from '../module-storage';

export class TweetTextBayesianFilter implements TweetFilter {
  // 形態素解析器
  private segmenter: any;

  // ベイジアンフィルタ
  private bayes: any;

  constructor(private filterSettings: any, private storage: ModuleStorage) {
    this.segmenter = new TinySegmenter();
    this.bayes = null;
  }

  getDescription() {
    return 'ツイートの本文に対するベイジアンフィルタ';
  }

  getScope() {
    return 'ツイートの本文';
  }

  getSettingsDefinition() {
    return [];
  }

  protected async initBayes() {
    if (this.bayes !== null) {
      return;
    }

    // ベイジアンフィルタの初期化
    const tokenizer = (text: string) => {
      let cleanText = text
        // 先頭のRTを消去
        .replace(/^RT /g, '')
        // URLを消去
        .replace(/https?:\/\/[\w!?/\+\-_~=;\.,*&@#$%\(\)\'\[\]]+/g, '')
        // メンションを消去
        .replace(/@[a-zA-Z0-9_\-]+/g, '')
        // ハッシュタグを消去
        .replace(/[#＃]([Ａ-Ｚａ-ｚA-Za-z一-鿆0-9０-９ぁ-ヶｦ-ﾟー])+/g, '$1')
        // 参照文字を消去
        .replace(/&amp;/g, '&')
        // その他のうまく処理できないワードを消去
        .replace(/(Master|MASTER)[\+＋]* (Lv|LV)[ \.][\d]{2,2}/g, '')
        .replace(/\d{1,2}:\d{1,2}/g, '')
        .replace(/\d{1,2}時\d{1,2}分/g, '');

      return this.segmenter.segment(cleanText);
    };
    this.bayes = Bayes({
      tokenizer: tokenizer,
    });

    // 学習データの読み込み
    const storedClassifier = await this.storage.get('storedClassifier');
    if (!storedClassifier) return;
    try {
      this.bayes = Bayes.fromJson(storedClassifier);
      this.bayes.tokenizer = tokenizer;
    } catch (e) {
      console.warn(e);
    }
  }

  async filter(tweet: CrawledTweet): Promise<number> {
    // ベイジアンフィルタを初期化
    await this.initBayes();
    // ベイジアンフィルタでツイートの本文からカテゴリを予測
    const category = this.bayes.categorize(tweet.text);
    // カテゴリに応じた数値を返す
    return category === 'accept' ? 1 : 0;
  }

  async train(tweet: CrawledTweet, isSelected: boolean) {
    // ベイジアンフィルタを初期化
    await this.initBayes();
    // ベイジアンフィルタでツイートの本文を学習
    const label = isSelected ? 'accept' : 'reject';
    this.bayes.learn(tweet.text, label);
    // ベイジアンフィルタを保存
    this.storage.set('storedClassifier', this.bayes.toJson());
  }
}
