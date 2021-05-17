import {
  Tweet,
  TweetFilter,
  TweetFilterHelper,
  TweetFilterSettingsDefinition,
  TweetFilterResult,
  TweetFilterResultWithMultiValues,
} from '@arisucool/im-pact-core';
import axios from 'axios';
import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';

export default class FilterTweetImageNsfwjs implements TweetFilter {
  protected nsfwjs: nsfwjs.NSFWJS = null;

  constructor(private helper: Readonly<TweetFilterHelper>) {}

  getDescription() {
    return 'NSFW JS による画像判定フィルタ';
  }

  getScope() {
    return 'ツイートの添付画像';
  }

  getSettingsDefinition(): TweetFilterSettingsDefinition[] {
    return [];
  }

  async shouldInitialize(): Promise<boolean> {
    return false;
  }

  private async initialize() {
    if (this.nsfwjs) {
      return;
    }

    this.nsfwjs = await nsfwjs.load('https://ml.files-sashido.cloud/models/nsfw_mobilenet_v2/93/');
  }

  async filter(tweet: any): Promise<TweetFilterResultWithMultiValues | TweetFilterResult> {
    // 初期化
    await this.initialize();

    // ツイートから画像URLを取得
    let tweetImageUrls = null;
    if (tweet.imageUrls && 1 <= tweet.imageUrls.length) {
      tweetImageUrls = tweet.imageUrls;
    } else {
      // TODO: 開発中の古い仕様のために、このコードを残している。
      tweetImageUrls = this.getImageUrlsByTweet(JSON.parse(tweet.rawJSONData));
    }
    if (!tweetImageUrls || tweetImageUrls.length === 0) {
      // 画像がなければ、0を返す
      return this.getFilterResultByPredictions(
        {
          drawing: 0.0,
          hentai: 0.0,
          neutral: 0.0,
          porn: 0.0,
          sexy: 0.0,
        },
        null,
      );
    }

    // 当該ツイートの判定結果のキャッシュを検索
    const cachedPredictions = await this.helper.getTweetStorage().get(tweet.id, 'cachedPredictions');
    if (cachedPredictions) {
      // キャッシュがあれば、キャッシュから返す
      console.log(
        `[TweetImageNsfwjsFilter] filter - return from cache... ${cachedPredictions} for ID: ${tweet.idStr} (classifiedTweetId = ${tweet.id})`,
      );
      return this.getFilterResultByPredictions(cachedPredictions, tweetImageUrls);
    }

    // 各画像に対して推論を実行
    const predictionResults = [];
    for (const imageUrl of tweetImageUrls) {
      const predictionResult = await this.predictByImageUrl(imageUrl);
      if (predictionResult === null) continue;
      predictionResults.push(predictionResult);
    }

    // 各画像の推論結果を結合
    const combinedPedictionResult = {
      drawing: 0.0,
      hentai: 0.0,
      neutral: 0.0,
      porn: 0.0,
      sexy: 0.0,
    };
    for (const predictionResult of predictionResults) {
      for (const key of Object.keys(predictionResult)) {
        if (combinedPedictionResult[key] < predictionResult[key]) {
          combinedPedictionResult[key] = predictionResult[key];
        }
      }
    }
    console.log(`[TweetImageNsfwjsFilter] filter - combied result... ${JSON.stringify(combinedPedictionResult)}`);

    // 値をキャッシュとして保存
    await this.helper.getTweetStorage().set(tweet.id, 'cachedPredictions', combinedPedictionResult);

    // 値を返す
    return this.getFilterResultByPredictions(combinedPedictionResult, tweetImageUrls);
  }

  /**
   * 実行結果の生成
   * @param predictions 推論結果
   * @param imageUrl 画像のURL
   * @retrun ツイートフィルタの実行結果
   */
  private getFilterResultByPredictions(
    predictions: { [key: string]: number },
    tweetImageUrls: string[],
  ): TweetFilterResultWithMultiValues {
    return {
      summary: {
        evidenceTitle: 'Attached Image of Tweet',
        evidenceImageUrls: tweetImageUrls,
      },
      values: {
        probDrawing: {
          title: 'Probability of Drawing (safe for work drawings (including anime))',
          value: predictions.drawing,
        },
        probHentai: {
          title: 'Probability of Hentai (hentai and pornographic drawings)',
          value: predictions.hentai,
        },
        probNeutral: {
          title: 'Probability of Hentai (safe for work neutral images)',
          value: predictions.neutral,
        },
        probPorn: {
          title: 'Probability of Porn (pornographic images, sexual acts)',
          value: predictions.porn,
        },
        probSexy: {
          title: 'Probability of Sexy (sexually explicit images, not pornography)',
          value: predictions.sexy,
        },
      },
    };
  }

  /**
   * 指定された画像URLからの推論
   * @param image_url
   * @return 推論結果
   */
  private async predictByImageUrl(imageUrl: string): Promise<{ [key: string]: number }> {
    if (!this.nsfwjs) {
      throw new Error(`[TweetImageNsfwjsFilter] classifyByImageUrl - Model file is not loaded!`);
    }

    // 画像ファイルをダウンロードして開く
    let image = null;
    try {
      image = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
    } catch (e) {
      console.warn(`Could not open this image... ${imageUrl} ... ${e.stack}`);
      return null;
    }

    // 画像を Tensor 4D へ変換
    const decodedImage = tf.node.decodeImage(image.data, 3) as tf.Tensor3D;

    // 推論を実行
    console.log(`[TweetImageNsfwjsFilter] classifyByImageUrl - Predicting... ${imageUrl}`);
    const predictions = await this.nsfwjs.classify(decodedImage);

    // 変数を解放
    decodedImage.dispose();

    // 結果を連想配列へ変換
    const predictionResult = {
      drawing: 0.0,
      hentai: 0.0,
      neutral: 0.0,
      porn: 0.0,
      sexy: 0.0,
    };
    for (const prediction of predictions) {
      switch (prediction.className) {
        case 'Drawing':
          predictionResult.drawing = prediction.probability;
          break;
        case 'Hentai':
          predictionResult.hentai = prediction.probability;
          break;
        case 'Neutral':
          predictionResult.neutral = prediction.probability;
          break;
        case 'Porn':
          predictionResult.porn = prediction.probability;
          break;
        case 'Sexy':
          predictionResult.sexy = prediction.probability;
          break;
      }
    }

    // 結果を返す
    return predictionResult;
  }

  /**
   * 指定されたツイートからの画像URLの取得
   * @param tweet ツイート
   * @return 画像URLの配列
   */
  private getImageUrlsByTweet(rawTweet: any) {
    // 画像URLを抽出するための配列を初期化
    let imageUrls = [];

    // ツイートにメディアが存在するか判定
    if (rawTweet.entities && rawTweet.entities.media) {
      // ツイートのメディアを反復
      for (const media of rawTweet.entities.media) {
        if (media.type !== 'photo') {
          // 画像でなければ
          // スキップ
          continue;
        }

        // 当該画像URLを配列へ追加
        imageUrls.push(media.media_url_https);
      }
    }

    // リツイートにメディアが存在するか判定
    if (rawTweet.retweeted_status && rawTweet.retweeted_status.entities && rawTweet.retweeted_status.entities.media) {
      // ツイートのメディアを反復
      for (const media of rawTweet.retweeted_status.entities.media) {
        if (media.type !== 'photo') {
          // 画像でなければ
          // スキップ
          continue;
        }

        // 当該画像URLを配列へ追加
        imageUrls.push(media.media_url_https);
      }
    }

    // 重複を除去
    imageUrls = imageUrls.filter((x, i, self) => {
      return self.indexOf(x) === i;
    });

    // 画像URLの配列を返す
    return imageUrls;
  }
}
