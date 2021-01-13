import { TweetFilter } from '../interfaces/tweet-filter.interface';
import { TweetFilterTrain } from '../interfaces/tweet-filter-train.interface';
import { ModuleHelper } from '../../module-helper';
import { Tweet } from 'src/topics/ml/entities/tweet.entity';
import * as TinySegmenter from 'tiny-segmenter';
import * as Bayes from 'bayes';

export class TweetTextBayesianFilter implements TweetFilter, TweetFilterTrain {
  // 形態素解析器
  private segmenter: any;

  // ベイジアンフィルタ
  private bayes: any;

  constructor(private helper: Readonly<ModuleHelper>) {
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

    // トピックのキーワードの取得
    // (ベイジアンフィルタの学習からキーワードを取り除くことで精度を上げる試み)
    const topicKeywords = await this.helper.getTopicKeywords();

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

      for (const keyword of topicKeywords) {
        // トピックで指定されたキーワードを本文から取り除く
        cleanText = cleanText.replace(new RegExp(keyword, 'g'), '');
      }

      // 抽出されたトークン (分かち書き) を返す
      return this.segmenter.segment(cleanText);
    };
    this.bayes = Bayes({
      tokenizer: tokenizer,
    });

    // 学習データの読み込み
    const storedClassifier = await this.helper.getStorage().get('storedClassifier');
    if (!storedClassifier) return;
    try {
      this.bayes = Bayes.fromJson(storedClassifier);
      this.bayes.tokenizer = tokenizer;
    } catch (e) {
      console.warn(e);
    }
  }

  async filter(tweet: Tweet): Promise<number> {
    // ベイジアンフィルタを初期化
    await this.initBayes();
    // ベイジアンフィルタでツイートの本文からカテゴリを予測
    const category = await this.bayes.categorize(tweet.text);
    //console.log(`[TweetTextBayesianFilter] filter - Categorized... ${category}, ${tweet.text}`);
    // カテゴリに応じた数値を返す
    return category === 'accept' ? 1 : 0;
  }

  async train(tweet: Tweet, isSelected: boolean) {
    // ベイジアンフィルタを初期化
    await this.initBayes();
    // ベイジアンフィルタでツイートの本文を学習
    const label = isSelected ? 'accept' : 'reject';
    if (isSelected) {
      // 対象ツイートならば、何回も学習させておく
      // (本システムの特性上、対象・非対象でデータセットの偏りが大きいことが想定されるため)
      for (let i = 0; i < 4; i++) {
        await this.bayes.learn(tweet.text, label);
      }
    } else {
      // 非対象ツイートならば
      await this.bayes.learn(tweet.text, label);
    }
    // ベイジアンフィルタを保存
    this.helper.getStorage().set('storedClassifier', this.bayes.toJson());
  }
}
