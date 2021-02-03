import { TweetFilter, TweetFilterSettingsDefinition } from '../interfaces/tweet-filter.interface';
import { Tweet } from 'src/topics/ml/entities/tweet.entity';
import { TweetFilterHelper } from '../../tweet-filter-helper';
import * as tf from '@tensorflow/tfjs-node';
import * as Jimp from 'jimp';
import * as fs from 'fs';

export class TfIllustImageClassificationFilter implements TweetFilter {
  // 機械学習モデルファイルのディレクトリパス
  // NOTE: https://github.com/arisucool/tf-cg-illust-classifier/tree/master/tfjs から取得したもの
  private modelDirPath: string = null;

  // 機械学習モデル
  private model: any = null;

  // 分類ラベル
  private labels: any[] = [];

  constructor(private helper: Readonly<TweetFilterHelper>) {
    this.modelDirPath = `${__dirname}/assets/tfjs-model/`;
  }

  getDescription() {
    return 'Tensorflow によるイラスト判定フィルタ';
  }

  getScope() {
    return 'ツイートの添付画像';
  }

  getSettingsDefinition(): TweetFilterSettingsDefinition[] {
    return [];
  }

  /**
   * 初期化
   */
  private async initialize() {
    if (this.model && this.labels) {
      // 初期化済みならば
      return;
    }

    let modelFilePath = `${this.modelDirPath}model.json`;
    let labelsFilePath = `${this.modelDirPath}metadata.json`;

    // 機械学習モデルファイルの存在を確認
    if (!fs.existsSync(modelFilePath)) {
      // モデルファイルが存在しなければ
      console.warn(`[TfIllustImageClassificationFilter] initialize - Model file is not found... ${modelFilePath}`);
      this.model = null;
      return;
    }

    // 分類ラベルファイルの存在を確認
    if (!fs.existsSync(labelsFilePath)) {
      // モデルファイルが存在しなければ
      console.warn(`[TfIllustImageClassificationFilter] initialize - Labels file is not found... ${labelsFilePath}`);
      this.model = null;
      return;
    }

    // 機械学習モデルファイルの読み込み
    this.model = await tf.loadLayersModel(`file://${modelFilePath}`);

    // 分類ラベルの読み込み
    this.labels = require(labelsFilePath).labels;
  }

  async filter(tweet: Tweet): Promise<number> {
    // 機械学習モデルを読み込む
    await this.initialize();

    // 当該ツイートの判定結果のキャッシュを検索
    const cachedClassifiedNumber = await this.helper.getTweetStorage().get(tweet.id, 'classfiedCache');
    if (cachedClassifiedNumber) {
      // キャッシュがあれば、キャッシュから返す
      console.log(
        `[TfIllustImageClassificationFilter] filter - return from cache... ${cachedClassifiedNumber} for ID: ${tweet.idStr} (extractedTweetId = ${tweet.id})`,
      );
      return +cachedClassifiedNumber;
    }

    // ツイートから画像URLを取得
    const tweetImageUrls = this.getImageUrlsByTweet(JSON.parse(tweet.rawJSONData));
    if (tweetImageUrls.length === 0) {
      // 画像がなければ、0を返す
      return 0;
    }

    // 各画像に対してクラス分類を実行
    const classNames = [];
    for (const imageUrl of tweetImageUrls) {
      const className = await this.classifyByImageUrl(imageUrl);
      if (className == null) continue;
      classNames.push(className);
    }

    if (classNames.length === 0) {
      // 分類不可能ならば、0を返す
      return 0;
    }

    // クラス分類の結果に応じて値を選択
    let classifiedNumber = 0;
    if (classNames.indexOf('fan_illust') != -1) {
      // 一つでも fan_illust があれば、3を返す
      classifiedNumber = 3;
    } else if (classNames.indexOf('official_illust') != -1) {
      // 違えば、一つでも official_illust があれば、2を返す
      classifiedNumber = 2;
    } else {
      // その他ならば、1を返す
      classifiedNumber = 1;
    }

    // 値をキャッシュとして保存
    await this.helper.getTweetStorage().set(tweet.id, 'classfiedCache', classifiedNumber);

    // 値を返す
    return classifiedNumber;
  }

  /**
   * 指定された画像URLからのクラス分類
   * @param image_url
   * @return 分類された結果 ('not_illust', 'official_illust', 'fan_illust')
   */
  private async classifyByImageUrl(imageUrl: string): Promise<string> {
    if (!this.model) {
      throw new Error(`[TfIllustImageClassificationFilter] classifyByImageUrl - Model file is not loaded!`);
    }

    // 画像ファイルをダウンロードして開く
    let image = null;
    try {
      image = await Jimp.read(imageUrl);
    } catch (e) {
      console.warn(`Could not open this image... ${imageUrl} ... ${e.stack}`);
      return null;
    }

    // 画像をリサイズ
    image.cover(224, 224, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);

    // 画像をノーマライズ
    const NUM_OF_CHANNELS = 3;
    let values = new Float32Array(224 * 224 * NUM_OF_CHANNELS);

    let i = 0;
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
      pixel.r = pixel.r / 127.0 - 1;
      pixel.g = pixel.g / 127.0 - 1;
      pixel.b = pixel.b / 127.0 - 1;
      pixel.a = pixel.a / 127.0 - 1;
      values[i * NUM_OF_CHANNELS + 0] = pixel.r;
      values[i * NUM_OF_CHANNELS + 1] = pixel.g;
      values[i * NUM_OF_CHANNELS + 2] = pixel.b;
      i++;
    });
    image = null;

    // 画像を Tensor 4D へ変換
    const outShape: [number, number, number] = [224, 224, NUM_OF_CHANNELS];
    let img_tensor = tf.tensor3d(values, outShape, 'float32');
    img_tensor = img_tensor.expandDims(0);

    // 推論を実行
    console.log(`[TfIllustImageClassificationFilter] classifyByImageUrl - Predicting... ${imageUrl}`);
    let predictions = await this.model.predict(img_tensor);
    predictions = predictions.dataSync();

    // 推論結果を取得
    let top_class = null;
    for (let i = 0; i < predictions.length; i++) {
      const label = this.labels[i];
      const probability = predictions[i];

      if (!top_class || top_class.probability < probability) {
        top_class = {
          label: label,
          probability: probability,
        };
      }
    }

    // 掃除
    values = null;
    img_tensor = null;

    // 推論結果を返す
    if (top_class == null) {
      console.warn(`[TfIllustImageClassificationFilter] classifyByImageUrl - Could not classified`);
      return null;
    }

    console.log(
      `[TfIllustImageClassificationFilter] classifyByImageUrl - Classified ${imageUrl} => ${top_class.label} (${top_class.probability})`,
    );

    return top_class.label;
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
