import {
  Tweet,
  TweetFilter,
  TweetFilterHelper,
  TweetFilterSettingsDefinition,
  TweetFilterTrain,
  TweetFilterResultWithMultiValues,
} from '@arisucool/im-pact-core';
import * as TinySegmenter from 'tiny-segmenter';
import * as Bayes from 'bayes-multiple-categories';

export default class FilterTweetTextBayesian implements TweetFilter, TweetFilterTrain {
  // 形態素解析器
  private segmenter: any;

  // ベイジアンフィルタ
  private bayes: any;

  constructor(private helper: Readonly<TweetFilterHelper>) {
    this.segmenter = new TinySegmenter();
    this.bayes = null;
  }

  getDescription() {
    return 'ツイートの本文に対するベイジアンフィルタ';
  }

  getScope() {
    return 'ツイートの本文';
  }

  getSettingsDefinition(): TweetFilterSettingsDefinition[] {
    return [];
  }

  async shouldInitialize(): Promise<boolean> {
    return (await this.helper.getStorage().get('storedClassifier')) === undefined;
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

  async filter(tweet: Tweet): Promise<TweetFilterResultWithMultiValues> {
    // ベイジアンフィルタを初期化
    await this.initBayes();

    // ベイジアンフィルタでツイートの本文からカテゴリを予測
    // const category = await this.bayes.categorize(tweet.text);

    // accept カテゴリの確率を取得
    const numOfCategories = 2;
    const results = await this.bayes.categorizeMultiple(tweet.text, numOfCategories);
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
    const resultChoiceKey = probabilityOfReject < probabilityOfAccept ? 'accept' : 'reject';

    // フィルタ結果を返す
    return {
      summary: {
        evidenceTitle: 'ツイート本文',
        evidenceText: tweet.text,
        resultChoiceKey: resultChoiceKey,
      },
      values: {
        probabilityOfAccept: {
          title: 'ツイート本文が承認である確率',
          value: probabilityOfAccept,
        },
        probabilityOfReject: {
          title: 'ツイート本文が拒否である確率',
          value: probabilityOfReject,
        },
      },
      choices: 'acceptOrReject',
    };
  }

  async train(tweet: Tweet, isSelected: boolean): Promise<void> {
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
    await this.helper.getStorage().set('storedClassifier', this.bayes.toJson());
  }

  async retrain(tweet: Tweet, previousChoiceKey: string, correctChoiceKey: string): Promise<void> {
    console.log('retrain', correctChoiceKey);
    this.train(tweet, correctChoiceKey === 'accept' ? true : false);
  }
}
