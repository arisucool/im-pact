import { Injectable } from '@nestjs/common';
import { GetExampleTweetsDto } from './dto/get-example-tweets.dto';
import { createDeflateRaw } from 'zlib';
import * as Twitter from 'twitter';
import * as tf from '@tensorflow/tfjs-node';
import { SocialAccount } from '../../social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TrainAndValidateDto } from './dto/train-and-validate.dto';
import { CrawledTweet } from './entities/crawled-tweet.entity';
import { validate } from 'class-validator';
import { TweetFilterManager } from './tweet-filters';
import * as fs from 'fs';

@Injectable()
export class MlService {
  constructor(
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
  ) {}

  /**
   * 利用可能なツイートフィルタの取得
   */
  async getAvailableTweetFilters() {
    const manager = new TweetFilterManager();
    const filterNames = await manager.getAvailableModuleNames();

    let filters = {};
    for (const filterName of filterNames) {
      let mod = null;
      try {
        mod = manager.getModule(filterName, {});
      } catch (e) {
        console.warn(`[MlService] getAvailableTweetFilters - Error = `, e);
        continue;
      }

      if (mod === null) {
        console.warn(`[MlService] getAvailableTweetFilters - This module is null... `, filterName);
        continue;
      }

      filters[filterName] = {
        version: '1.0.0', // TODO
        description: mod.getDescription(),
        scope: mod.getScope(),
        settings: mod.getSettingsDefinition(),
      };
    }

    return filters;
  }

  /**
   * トレーニングおよび検証
   * (お手本分類の結果と、ツイートフィルタ設定をもとにデータセットを生成し、分類器のモデルを生成し、検証を行う)
   * @return トレーニングおよび検証の結果
   */
  async trainAndValidate(dto: TrainAndValidateDto) {
    // データセットを生成
    let generatedDatasets = await this.getTrainingDatasets(dto.trainingTweets, dto.filters);

    // データセットの変数の数を取得
    const numOfFeatures = generatedDatasets.numOfFeatures;

    // データセットに対してバッチを実行
    const BATCH_SIZE = 16;
    console.log(`[MlService] trainAndValidate - Applying batch to dataset...`);
    const trainingDataset = generatedDatasets.trainingDataset.batch(BATCH_SIZE);
    const validationDataset = generatedDatasets.validationDataset.batch(BATCH_SIZE);
    console.log(
      `[MlService] trainAndValidate - batch applied... ${JSON.stringify(trainingDataset)}, ${JSON.stringify(
        validationDataset,
      )}`,
    );

    // 学習モデルの生成
    const trainingResult = await this.trainModel(trainingDataset, validationDataset, numOfFeatures);
    const trainedModel = trainingResult.model;

    // 検証用データセット(バッチ加工済み)による検証の実行
    const scoreByValidationDataset = await this.validate(trainedModel, validationDataset, numOfFeatures);

    // 学習用データセット(バッチ加工済み)による検証の実行
    const scoreByTrainingDataset = await this.validate(trainedModel, trainingDataset, numOfFeatures);

    // お手本分類の結果による検証の実行
    const resultOfTrainingTweets = await this.validateByTrainingTweets(
      trainedModel,
      dto.trainingTweets,
      numOfFeatures,
      dto.filters,
      false,
    );
    const scoreByTrainingTweets = resultOfTrainingTweets.score;

    // お手本分類の結果のうち、選択済みのツイートのみによる検証の実行
    const resultOfTrainingTweetsExceptUnselect = await this.validateByTrainingTweets(
      trainedModel,
      dto.trainingTweets,
      numOfFeatures,
      dto.filters,
      true,
    );
    const scoreByTrainingTweetsExceptUnselect = resultOfTrainingTweetsExceptUnselect.score;

    // 結果を返す
    const result = {
      trainingResult: {
        logs: trainingResult.logs,
      },
      validationResult: {
        score: Math.min(
          scoreByValidationDataset,
          scoreByTrainingDataset,
          scoreByTrainingTweets,
          scoreByTrainingTweetsExceptUnselect,
        ),
        scoreByValidationDataset: scoreByValidationDataset,
        scoreByTrainingDataset: scoreByTrainingDataset,
        scoreByTrainingTweets: scoreByTrainingTweets,
        scoreByTrainingTweetsExceptUnselect: scoreByTrainingTweetsExceptUnselect,
        classifiedTweets: resultOfTrainingTweets.tweets,
      },
    };
    console.log(`[MlService] trainAndValidate - Result =`, result);
    return result;
  }

  /**
   * トレーニングのためのデータセットの生成
   * @param trainingTweets お手本分類の結果
   * @param filterSettings ツイートフィルタ設定
   * @return 学習用データセットおよび検証用データセット
   */
  protected async getTrainingDatasets(trainingTweets: any[], filterSettings: any[]) {
    // 検証用にデータセットを分割する割合
    const VALIDATION_FRACTION = 0.01;

    // 変数の数を代入する変数
    let numOfFeatures = 0;

    // ツイートフィルタを管理するモジュールを初期化
    const filterManager = new TweetFilterManager();

    // 各ツイートを反復
    let rawDataset = [];
    for (let tweet of trainingTweets) {
      console.log(`[MlService] getTrainingDatasets - Tweet: ${tweet.idStr}, ${tweet.selected}`);
      // 当該ツイートに対してツイートフィルタを実行し、分類のための変数を取得
      let allFiltersResult = await filterManager.filterTweetByFilterSettings(tweet, filterSettings);
      numOfFeatures = allFiltersResult.length;
      // 生データセットの行を生成
      let rawDataRow = [];
      rawDataRow = rawDataRow.concat(allFiltersResult);
      rawDataRow.push(tweet.selected);
      // 生データセットへ追加
      rawDataset.push(rawDataRow);
    }

    // 生データセットを複製してシャッフル
    let shuffledRawDataset = rawDataset.slice();
    tf.util.shuffle(shuffledRawDataset);

    // データセットを学習用と検証用へ分割
    const numofValidationExamples = Math.round(rawDataset.length * VALIDATION_FRACTION);
    const numofTrainingExamples = rawDataset.length - numofValidationExamples;
    const trainingRawDataset = shuffledRawDataset.slice(0, numofTrainingExamples);
    const validationRawDataset = shuffledRawDataset.slice(numofTrainingExamples);

    // データセットを X および Y へ分割し、feature mapping transformations を適用
    console.log(`[MlService] getTrainingDatasets - Applying feature mapping transformations...`);
    const trainingX = tf.data.array(trainingRawDataset.map(r => r.slice(0, numOfFeatures)));
    const validationX = tf.data.array(validationRawDataset.map(r => r.slice(0, numOfFeatures)));
    const trainingY = tf.data.array(trainingRawDataset.map(r => this.flatOneHot(r[numOfFeatures])));
    const validationY = tf.data.array(validationRawDataset.map(r => this.flatOneHot(r[numOfFeatures])));

    // x および y をデータセットへ再結合
    console.log(`[MlService] getTrainingDatasets - Recombine...`);
    const trainingDataset = tf.data.zip({ xs: trainingX, ys: trainingY });
    const validationDataset = tf.data.zip({ xs: validationX, ys: validationY });

    // デバッグ出力
    console.log(`[MlService] getTrainingDatasets - Dataset:`);
    (await trainingDataset.toArray()).forEach(row => {
      console.log(row);
    });
    console.log(`[MlService] getTrainingDatasets - Training dataset: ${JSON.stringify(trainingDataset)}`);
    console.log(`[MlService] getTrainingDatasets - Validation dataset: ${JSON.stringify(validationDataset)}`);

    // データセットを返す
    return {
      trainingDataset: trainingDataset,
      validationDataset: validationDataset,
      numOfFeatures: numOfFeatures,
    };
  }

  protected flatOneHot(index: any) {
    return Array.from(tf.oneHot([index], 3).dataSync());
  }

  /**
   * 学習モデルの生成
   * @param trainingDataset 学習用データセット
   * @param validationDataset 検証用データセット
   * @param numOfFeatures データセットの変数の数
   * @return 生成されたモデル
   */
  protected async trainModel(trainingDataset: any, validationDataset: any, numOfFeatures: number) {
    // トレーニングのためのパラメータ
    const TRAIN_EPOCHS = 30;
    const LEARNING_RATE = 0.01;

    // 学習モデルのトポロジを定義
    console.log(`[MlService] trainModel - Making toporogy...`);
    const model = tf.sequential();
    model.add(
      tf.layers.dense({
        units: 10,
        activation: 'sigmoid',
        inputShape: [numOfFeatures],
      }),
    );
    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
    model.summary();

    console.log(`[MlService] trainModel - Compiling model...`);
    const optimizer = tf.train.adam(LEARNING_RATE);
    model.compile({
      optimizer: optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    // 学習の実行
    console.log(`[MlService] trainModel - Executing fit datset...`);
    const logs: tf.Logs[] = [];
    await model.fitDataset(trainingDataset, {
      epochs: TRAIN_EPOCHS,
      validationData: validationDataset,
      callbacks: {
        onEpochEnd: async (epoch, epoch_log) => {
          logs.push(epoch_log);
        },
      },
    });

    // 学習モデルおよび学習結果を返す
    return { model: model, logs: logs };
  }

  /**
   * 指定されたデータセットによる学習モデルの検証
   * @param trainedModel 学習モデル
   * @param validationDataset 検証用データセット
   * @param numOfFeatures データセットの変数の数
   * @return スコア
   */
  protected async validate(
    trainedModel: tf.Sequential,
    validationDataset: any,
    numOfFeatures: number,
  ): Promise<number> {
    const [{ xs: xTest, ys: yTest }] = await validationDataset.toArray();
    // 検証用データセットの値を取得
    const xData = xTest.dataSync();
    // 検証用データセットの正しい答えを取得
    const yTrue = yTest.argMax(-1).dataSync();
    let predictOutRaw = trainedModel.predict(xTest) as tf.Tensor;
    // 検証用データセットの予測した答えを取得
    const yPred = predictOutRaw.argMax(-1).dataSync();
    //let predictOut = predictOutRaw.dataSync();

    // 検証用データセットを反復
    let numOfValidationDataset = yTrue.length;
    let score = 0.0;
    for (let i = 0; i < numOfValidationDataset; ++i) {
      /*for (let j = 0; j < numOfFeatures; ++j) {
        console.log(xData[numOfFeatures * i + j]);
      }*/
      console.log(`[MlService] validate - [${i}] - Truth = ${yTrue[i]}, Pred = ${yPred[i]}`);

      // 予測した答えが正しいか判定
      if (yTrue[i] != yPred[i]) {
        // 不正解ならば、次へ
        continue;
      }

      // 点数を加点
      score += 100 / numOfValidationDataset;
    }
    return Math.ceil(score);
  }

  /**
   * 指定されたお手本分類の結果による学習モデルの検証・分類
   * @param trainedModel 学習モデル
   * @param tweets お手本分類の結果
   * @param numOfFeatures データセットの変数の数
   * @param excludeUnselectedTweets お手本分類でユーザによって選択されなかったツイートを検証から除外するか
   * @return 検証および分類の結果
   */
  protected async validateByTrainingTweets(
    trainedModel: tf.Sequential,
    tweets: any[],
    numOfFeatures: number,
    filterSettings: any[],
    excludeUnselectedTweets: boolean = false,
  ): Promise<{ score: number; tweets: any[] }> {
    // 検証するツイートを抽出
    let validationTweets: any[] = [];
    for (let tweet of tweets) {
      if (excludeUnselectedTweets) {
        if (tweet.selected) {
          validationTweets.push(tweet);
        }
      } else {
        validationTweets.push(tweet);
      }
    }

    // 変数を初期化
    let score = 0,
      numOfTweets = validationTweets.length;

    // フィルタマネージャを初期化
    const filterManager = new TweetFilterManager();

    // 検証するツイートを反復
    let i = 0;
    for (let tweet of validationTweets) {
      // 当該ツイートに対してツイートフィルタを実行し、分類のための変数を取得
      let allFiltersResult = await filterManager.filterTweetByFilterSettings(tweet, filterSettings);
      // 予測を実行
      const predictedClass = (trainedModel.predict(tf.tensor2d(allFiltersResult, [1, numOfFeatures])) as tf.Tensor)
        .argMax(-1)
        .dataSync()[0];

      // 予測した答えを追加
      validationTweets[i].predictedSelect = predictedClass == 1;
      i++;

      // 予測した答えが正しいか判定
      const correctClass = tweet.selected ? 1 : 0;

      console.log(
        `[MlService] validateByTrainingTweets - tweet = ${tweet.idStr}, predictedClass = ${predictedClass}, correctClass = ${correctClass}`,
      );
      const isCorrect = correctClass === predictedClass;
      if (!isCorrect) {
        // 不正解ならば、次へ
        continue;
      }

      // 検証の点数を加点
      score += 100 / numOfTweets;
    }

    return {
      score: Math.ceil(score),
      tweets: validationTweets,
    };
  }

  /**
   * 学習用サンプルツイートの取得
   * (未収集ならば、収集もあわせて行う)
   * @param dto 学習用サンプルツイートを収集するための情報
   * @return 検索結果のツイート配列
   */
  async getExampleTweets(dto: GetExampleTweetsDto) {
    // 収集されたツイートを検索
    let crawledTweets = await this.crawledTweetRepository.find({
      crawlKeyword: dto.keyword,
    });
    if (100 <= crawledTweets.length) {
      // 100件以上あれば
      return crawledTweets;
    }

    // 新たにツイートを収集
    await this.crawlExampleTweets(dto);

    // 収集されたツイートを再検索
    crawledTweets = await this.crawledTweetRepository.find({
      crawlKeyword: dto.keyword,
    });
    return crawledTweets;
  }

  /**
   * 学習用サンプルツイートの収集
   * @param dto 学習用サンプルツイートを収集するための情報
   */
  protected async crawlExampleTweets(dto: GetExampleTweetsDto) {
    // Twitter上でツイートを検索
    const tweets = await this.searchTweetsByKeyword(dto.crawlSocialAccountId, dto.keyword);
    console.log(`[MlService] getExampleTweets - Found ${tweets.length} tweets`);

    // ツイートを反復
    for (const tweet of tweets) {
      // 当該ツイートを保存
      await this.saveTweet(dto.keyword, tweet, true);
    }
  }

  /**
   * ツイートの保存
   * @param keyword 検索時のキーワード
   * @param tweet  ツイート
   * @param should_integrate_rt リツイート (引用リツイートを除く) を元ツイートへ統合するか
   */
  protected async saveTweet(keyword: string, tweet: any, should_integrate_rt: boolean) {
    // 当該ツイートがデータベースに存在しないか確認
    const exists_tweet =
      0 <
      (
        await this.crawledTweetRepository.find({
          idStr: tweet.id_str,
        })
      ).length;
    if (exists_tweet) {
      // 既に存在するならば、スキップ
      return;
    }

    // ツイートのオブジェクトを初期化
    const crawledTweet = new CrawledTweet();

    // ツイートの情報を付加
    crawledTweet.idStr = tweet.id_str;
    crawledTweet.createdAt = tweet.created_at;
    crawledTweet.crawlKeyword = keyword;
    crawledTweet.rawJSONData = JSON.stringify(tweet);
    crawledTweet.socialAccount = null; // TODO
    crawledTweet.text = tweet.text;
    crawledTweet.url = `https://twitter.com/${tweet.user.id_str}/status/${tweet.id_str}`;
    crawledTweet.crawledRetweetIdStrs = [];

    // リツイート (引用リツイートを除く) のための処理
    if (tweet.retweeted_status) {
      if (should_integrate_rt) {
        // リツイートの統合が有効ならば、元ツイートのリツイート数を増加
        // (当該ツイート自体は残さず、元ツイートのみを残す)
        this.incrementRetweetCountOfOriginalTweet(keyword, tweet.id_str, tweet.retweeted_status);
        // 完了
        return;
      } else {
        // 元ツイートの情報を付加
        crawledTweet.originalIdStr = tweet.retweeted_status.id_str;
        crawledTweet.originalCreatedAt = tweet.retweeted_status.created_at;
        crawledTweet.originalUserIdStr = tweet.retweeted_status.user.id_str;
        crawledTweet.originalUserName = tweet.retweeted_status.user.name;
        crawledTweet.originalUserScreenName = tweet.retweeted_status.user.screen_name;
      }
    }

    // 引用リツイートのための処理
    if (tweet.quoted_status) {
      // 元ツイートのリツイート数を増加
      this.incrementRetweetCountOfOriginalTweet(keyword, tweet.id_str, tweet.quoted_status);
      // 元ツイートの情報を付加
      crawledTweet.originalIdStr = tweet.quoted_status.id_str;
      crawledTweet.originalCreatedAt = tweet.quoted_status.created_at;
      crawledTweet.originalUserIdStr = tweet.quoted_status.user.id_str;
      crawledTweet.originalUserName = tweet.quoted_status.user.name;
      crawledTweet.originalUserScreenName = tweet.quoted_status.user.screen_name;
    }

    // ツイート投稿者の情報
    crawledTweet.userIdStr = tweet.user.id_str;
    crawledTweet.userName = tweet.user.name;
    crawledTweet.userScreenName = tweet.user.screen_name;

    // 追加
    console.log(`[MlService] getExampleTweets - Inserting tweet... ${crawledTweet.idStr}`);
    await this.crawledTweetRepository.insert(crawledTweet);
  }

  /**
   * 指定された元ツイートに対するリツイート数の増加
   * @param keyword 検索時のキーワード
   * @param retweetIdStr リツイートのID文字列
   * @param originalTweet 元ツイートのオブジェクト
   * @return 元ツイートのリツイート数
   */
  protected async incrementRetweetCountOfOriginalTweet(
    keyword: string,
    retweetIdStr: string,
    originalTweet: any,
  ): Promise<number> {
    // 元ツイートを検索
    let original_tweets = await this.crawledTweetRepository.find({
      idStr: originalTweet.id_str,
    });

    if (original_tweets.length <= 0) {
      // 元ツイートが存在しなければ、元ツイートを保存
      console.log(`[MlService] saveTweet - Saving original tweet... (ID: ${originalTweet.id_str})`);
      await this.saveTweet(keyword, originalTweet, true);

      // 元ツイートを再検索
      original_tweets = await this.crawledTweetRepository.find({
        idStr: originalTweet.id_str,
      });
    }

    // 元ツイートにリツイートのID文字列を残す
    if (!original_tweets[0].crawledRetweetIdStrs) {
      original_tweets[0].crawledRetweetIdStrs = [];
    } else if (original_tweets[0].crawledRetweetIdStrs.indexOf(retweetIdStr) !== -1) {
      // 既にこのリツイートが含まれているならば、何もしない
      return;
    }
    original_tweets[0].crawledRetweetIdStrs.push(retweetIdStr);

    // 元ツイートのリツイート数を算出
    original_tweets[0].crawledRetweetCount = original_tweets[0].crawledRetweetIdStrs.length;
    console.log(
      `[MlService] saveTweet - Increment retweetCount... ${original_tweets[0].crawledRetweetCount} (ID: ${original_tweets[0].idStr})`,
    );

    // 元ツイートを保存
    await original_tweets[0].save();

    // 元ツイートのリツイート数を返す
    return original_tweets[0].crawledRetweetCount;
  }

  /**
   * 指定されたキーワードによる Twitter API 上でのツイートの検索
   * @param socialAccountId 検索に使用するソーシャルアカウントのID
   * @param keyword キーワード
   * @return 検索結果のツイート配列
   */
  protected async searchTweetsByKeyword(socialAccountId: number, keyword: string): Promise<any[]> {
    // クエリを整形
    let query = keyword;
    if (query.indexOf('"') === -1) {
      // キーワードにダブルクオートが含まれないならば
      // キーワードをダブルクオートで囲む
      query = `"${query}"`;
    }

    // 検索条件を設定
    const searchCondition = {
      q: query,
      lang: 'ja',
      result_type: 'recent',
      count: 100,
    };

    // 検索を実行
    return await this.searchTweets(socialAccountId, searchCondition);
  }

  /**
   * Twitter API 上でのツイートの検索
   * @param socialAccountId 検索に使用するソーシャルアカウントのID
   * @param searchCondition 検索条件
   * @return 検索結果のツイート配列
   */
  protected async searchTweets(socialAccountId: number, searchCondition: any): Promise<any[]> {
    // 収集に使用するソーシャルアカウントを取得
    const socialAccount = await this.socialAccountRepository.findOne(socialAccountId);
    if (!socialAccount) {
      throw new Error('Invalid social account');
    }

    // Twitter クライアントを初期化
    if (!process.env.TWITTER_CONSUMER_KEY)
      throw new Error('TWITTER_CONSUMER_KEY is not specfied in the environment variable.');
    if (!process.env.TWITTER_CONSUMER_SECRET)
      throw new Error('TWITTER_CONSUMER_SECRET is not specfied in the environment variable.');
    const twitterClient = new Twitter({
      access_token_key: socialAccount.accessToken,
      access_token_secret: socialAccount.accessTokenSecret,
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    });

    return new Promise((resolve, reject) => {
      // ツイートを検索
      twitterClient.get('search/tweets', searchCondition, (error, tweets, response) => {
        if (error) {
          return reject(error);
        }

        resolve(tweets.statuses);
      });
    });
  }
}
