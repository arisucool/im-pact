import { CrawledTweet } from '../../entities/crawled-tweet.entity';
import { TweetFilter } from '../interfaces/tweet-filter.interface';
import * as TinySegmenter from 'tiny-segmenter';
import * as Bayes from 'bayes';
import { ModuleHelper } from '../module-helper';

export class TweetAuthorProfileLikeFoloweeBayesianFilter implements TweetFilter {
  // 形態素解析器
  private segmenter: any;

  // ベイジアンフィルタ
  private bayes: any;

  constructor(private helper: Readonly<ModuleHelper>) {
    this.segmenter = new TinySegmenter();
    this.bayes = null;
  }

  getDescription() {
    return 'ツイートした人のプロフィールに対し、自身のフォロイーとの近さを測るベイジアンフィルタ';
  }

  getScope() {
    return 'ツイートした人のプロフィール';
  }

  getSettingsDefinition() {
    return [];
  }

  async filter(tweet: CrawledTweet): Promise<number> {
    // ベイジアンフィルタを初期化
    await this.initBayes();
    // ツイートした人のプロフィールからベイジアンフィルタでカテゴリを予測
    const userProfile = JSON.parse(tweet.rawJSONData).user.description;
    const category = await this.bayes.categorize(userProfile);
    console.log(`[TweetAuthorProfileLikeFoloweeBayesianFilter] filter - Categorized... ${category}, ${userProfile}`);
    // カテゴリに応じた数値を返す
    return category === 'accept' ? 1 : 0;
    return 1;
  }

  async train(tweet: CrawledTweet, isSelected: boolean) {
    // ベイジアンフィルタを初期化
    await this.initBayes();
    // ツイートした人のプロフィールをベイジアンフィルタで学習
    const userProfile = JSON.parse(tweet.rawJSONData).user.description;
    const label = isSelected ? 'accept' : 'reject';
    await this.bayes.learn(userProfile, label);
    // ベイジアンフィルタを保存
    this.helper.getStorage().set('storedClassifier', this.bayes.toJson());
  }

  async batch() {
    await this.trainFoloweeProfiles();
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
    const storedClassifier = await this.helper.getStorage().get('storedClassifier');
    if (!storedClassifier) return;
    try {
      this.bayes = Bayes.fromJson(storedClassifier);
      this.bayes.tokenizer = tokenizer;
    } catch (e) {
      console.warn(e);
    }
  }

  protected async trainFoloweeProfiles() {
    // ベイジアンフィルタを初期化
    await this.initBayes();

    // フォロイーを取得して反復
    const folowees = await this.getFolowees();
    for (const user of folowees) {
      // ベイジアンフィルタで各ユーザのプロフィールを学習
      const description = user.description;
      await this.bayes.learn(description, 'accept');
    }

    // 学習結果を保存
    this.helper.getStorage().set('storedClassifier', this.bayes.toJson());
  }

  protected async getFolowees(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // Twitter クライアントを初期化
      const twitterClient = this.helper.getTwitterClient();

      // フォロワーを取得
      const params = {
        count: 200,
        skip_status: true,
      };
      twitterClient.get('followers/list', params, (error, users, response) => {
        if (error) {
          return reject(error);
        }

        resolve(users.users);
      });
    });
  }
}
