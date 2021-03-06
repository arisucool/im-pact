import {
  Tweet,
  TweetFilter,
  TweetFilterHelper,
  TweetFilterSettingsDefinition,
  TweetFilterBatch,
  TweetFilterTrain,
  TweetFilterResultWithMultiValues,
} from '@arisucool/im-pact-core';
import * as TinySegmenter from 'tiny-segmenter';
import * as Bayes from 'bayes-multiple-categories';

export default class FilterTweetAuthorProfileLikeFollowerBayesian
  implements TweetFilter, TweetFilterBatch, TweetFilterTrain {
  // 形態素解析器
  private segmenter: any;

  // ベイジアンフィルタ
  private bayes: any;

  constructor(private helper: Readonly<TweetFilterHelper>) {
    this.segmenter = new TinySegmenter();
    this.bayes = null;
  }

  getDescription() {
    return 'ツイートした人のプロフィールに対し、自身のフォロイーとの近さを測るベイジアンフィルタ';
  }

  getScope() {
    return 'ツイートした人のプロフィール';
  }

  getSettingsDefinition(): TweetFilterSettingsDefinition[] {
    return [];
  }

  async shouldInitialize(): Promise<boolean> {
    return (await this.helper.getStorage().get('storedClassifier')) === undefined;
  }

  async filter(tweet: Tweet): Promise<TweetFilterResultWithMultiValues> {
    // ベイジアンフィルタを初期化
    await this.initBayes();

    // ツイートした人のプロフィールからベイジアンフィルタで各カテゴリの確率を予測
    const numOfCategories = 2;
    const userProfile = JSON.parse(tweet.rawJSONData).user.description;
    const results = await this.bayes.categorizeMultiple(userProfile, numOfCategories);

    // accept カテゴリの確率を取得
    const resultOfAccept = results.find((item: any) => {
      return item.category === 'accept';
    });
    const probabilityOfAccept = resultOfAccept ? resultOfAccept.propability : 0.0;

    // reject カテゴリの確率を取得
    const resultOfReject = results.find((item: any) => {
      return item.category === 'reject';
    });
    const probabilityOfReject = resultOfReject ? resultOfReject.propability : 0.0;

    // フィルタ結果のサマリを生成
    const summaryValue = probabilityOfReject < probabilityOfAccept ? 'accept' : 'reject';
    const summaryText = summaryValue === 'accept' ? 'このプロフィールは承認である' : 'このプロフィールは拒否である';

    // フィルタ結果を返す
    return {
      summary: {
        summaryText: summaryText,
        summaryValue: summaryValue,
        evidenceText: userProfile,
      },
      values: {
        probabilityOfAccept: {
          title: 'プロフィールが承認である確率',
          value: probabilityOfAccept,
        },
        probabilityOfReject: {
          title: 'プロフィールが拒否である確率',
          value: probabilityOfReject,
        },
      },
    };
  }

  async train(tweet: Tweet, isSelected: boolean) {
    // ベイジアンフィルタを初期化
    await this.initBayes();
    // ツイートした人のプロフィールをベイジアンフィルタで学習
    const userProfile = JSON.parse(tweet.rawJSONData).user.description;
    const label = isSelected ? 'accept' : 'reject';
    await this.bayes.learn(userProfile, label);
    // ベイジアンフィルタを保存
    await this.helper.getStorage().set('storedClassifier', this.bayes.toJson());
  }

  async retrain(tweet: Tweet, previousSummaryValue: string, isCorrect: boolean): Promise<void> {
    if (previousSummaryValue === 'accept') {
      this.train(tweet, isCorrect);
    } else if (previousSummaryValue === 'reject') {
      this.train(tweet, !isCorrect);
    }
  }

  async batch() {
    await this.trainFoloweeProfiles();
  }

  protected async initBayes() {
    if (this.bayes !== null) {
      return;
    }

    // トピックのキーワードの取得
    const topicKeywords = await this.helper.getTopicKeywords();

    // ベイジアンフィルタの初期化
    const tokenizer = (text: string) => {
      let cleanText = text
        // 先頭のRTを消去
        .replace(/^RT /g, '')
        // URLを消去
        .replace(/https?:\/\/[\w!?/\+\-_~=;\.,*&@#$%\(\)\'\[\]]+/g, '')
        // うまく処理できないワードを変換
        .replace(/(IDOLM@STER|ＩＤＯＬＭ＠ＳＴＥＲ)/g, 'IDOLMASTER')
        // メンションを消去
        .replace(/@[a-zA-Z0-9_\-]+/g, '')
        // 参照文字を消去
        .replace(/&amp;/g, '&')
        // 全角英数字を半角へ変換
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, str => {
          return String.fromCharCode(str.charCodeAt(0) - 0xfee0);
        })
        // ハッシュタグからハッシュ記号を消去
        .replace(/[#＃]([A-Za-z一-鿆0-9ぁ-ヶｦ-ﾟー]+)/g, '$1')
        // その他のうまく処理できないワードを消去
        .replace(/(Master|MASTER)[\+＋]* (Lv|LV)[ \.][\d]{2,2}/g, '')
        .replace(/\d{1,2}:\d{1,2}/g, '')
        .replace(/\d{1,2}時\d{1,2}分/g, '')
        // 記号を空白へ
        .replace(
          /["#$%&\'\\\\()*+,-./:;<=>?@\\^_`{|}~「」｢｣〔〕“”〈〉『』【】＆＊・（）()＄$＃#＠@。.、,？?！!｀＋￥％↑↓←→]/g,
          ' ',
        );

      // 検索ワードを独立させる
      // (例: "名探偵橘ありす" -> "名探偵 橘 ありす")
      for (const keyword of topicKeywords) {
        cleanText = cleanText.replace(new RegExp(keyword, 'g'), ' $1 ');
      }

      // 連続した空白を単一の空白へ変換
      cleanText = cleanText.replace(/\s{2,}/g, ' ');

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
    await this.helper.getStorage().set('storedClassifier', this.bayes.toJson());
  }

  protected async getFolowees(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // Twitter クライアントを初期化
      const twitterClient = this.helper.getTwitterClient();

      // フォロワーを取得
      const params = {
        count: 200,
        // eslint-disable-next-line @typescript-eslint/naming-convention
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
