import { Injectable, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import { SocialAccount } from '../../social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TrainAndValidateDto } from './dto/train-and-validate.dto';
import { TweetFilterManager } from './modules/tweet-filter-manager';
import { ModuleStorage } from './entities/module-storage.entity';
import { MlModel } from './entities/ml-model.entity';
import { Topic } from '../entities/topic.entity';
import { ActionManager } from './modules/action-manager';
import { ExtractedTweet } from './entities/extracted-tweet.entity';

@Injectable()
export class MlService {
  constructor(
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
    @InjectRepository(ModuleStorage)
    private moduleStorageRepository: Repository<ModuleStorage>,
    @InjectRepository(MlModel)
    private mlModelRepository: Repository<MlModel>,
  ) {}

  /**
   * 利用可能なアクションの取得
   */
  async getAvailableActions() {
    const actionManager = new ActionManager(this.moduleStorageRepository, this.socialAccountRepository, [], []);
    const actionNames = await actionManager.getAvailableModuleNames();

    let actions = {};
    for (const actionName of actionNames) {
      let mod = null;
      try {
        mod = await actionManager.getModule(actionName, null, null);
      } catch (e) {
        console.warn(`[MlService] getAvailableActions - Error = `, e);
        continue;
      }

      if (mod === null) {
        console.warn(`[MlService] getAvailableActions - This module is null... `, actionName);
        continue;
      }

      actions[actionName] = {
        // アクションのバージョン
        version: '1.0.0', // TODO
        // アクションの説明
        description: mod.getDescription(),
        // アクション設定の定義
        settings: mod.getSettingsDefinition(),
        // アクションで提供される機能
        features: {},
      };
    }

    return actions;
  }

  /**
   * 利用可能なツイートフィルタの取得
   */
  async getAvailableTweetFilters() {
    const filterManager = new TweetFilterManager(this.moduleStorageRepository, this.socialAccountRepository, [], []);
    const filterNames = await filterManager.getAvailableModuleNames();

    let filters = {};
    for (const filterName of filterNames) {
      let mod = null;
      try {
        mod = await filterManager.getModule(filterName);
      } catch (e) {
        console.warn(`[MlService] getAvailableTweetFilters - Error = `, e);
        continue;
      }

      if (mod === null) {
        console.warn(`[MlService] getAvailableTweetFilters - This module is null... `, filterName);
        continue;
      }

      filters[filterName] = {
        // フィルタのバージョン
        version: '1.0.0', // TODO
        // フィルタの説明
        description: mod.getDescription(),
        // フィルタの適用範囲
        scope: mod.getScope(),
        // フィルタ設定の定義
        settings: mod.getSettingsDefinition(),
        // フィルタで提供される機能
        features: {
          // 学習を行うか否か
          train: typeof mod.train === 'function',
          // バッチ処理を行うか否か
          batch: typeof mod.batch === 'function',
        },
      };
    }

    return filters;
  }

  /**
   * トレーニングおよび検証
   * (お手本分類の結果と、ツイートフィルタ設定をもとにデータセットを生成し、分類器の学習モデルを生成・保存し、検証を行う)
   * @return トレーニングおよび検証の結果
   */
  async trainAndValidate(dto: TrainAndValidateDto) {
    // データセットを生成
    Logger.log('getTrainingDatasets...', 'MlService/trainAndValidate');
    let generatedDatasets = await this.getTrainingDatasets(dto.trainingTweets, dto.filters, dto.topicKeywords);

    // データセットの変数の数を取得
    const numOfFeatures = generatedDatasets.numOfFeatures;

    // 学習モデルを生成
    Logger.log('Training model...', 'MlService/trainAndValidate');
    const trainingResult = await this.trainModel(
      generatedDatasets.trainingDataset,
      generatedDatasets.validationDataset,
      numOfFeatures,
    );
    const trainedModel = trainingResult.model;

    // 学習モデルをデータベースへ保存
    const trainedModelId = await this.saveTrainedModel(dto.topicId, trainedModel);

    // 検証用データセット(バッチ加工済み)による検証を実行
    Logger.log('Validating model...', 'MlService/trainAndValidate');
    const scoreByValidationDataset = await this.validate(
      trainedModel,
      generatedDatasets.validationDataset,
      numOfFeatures,
    );

    // 学習用データセット(バッチ加工済み)による検証を実行
    const scoreByTrainingDataset = await this.validate(trainedModel, generatedDatasets.trainingDataset, numOfFeatures);

    // お手本分類の結果による検証を実行
    const resultOfTrainingTweets = await this.validateByTrainingTweets(
      trainedModel,
      dto.trainingTweets,
      numOfFeatures,
      dto.filters,
      dto.topicKeywords,
      false,
    );
    const scoreByTrainingTweets = resultOfTrainingTweets.score;

    // お手本分類の結果のうち、選択済みのツイートのみによる検証を実行
    const resultOfTrainingTweetsExceptUnselect = await this.validateByTrainingTweets(
      trainedModel,
      dto.trainingTweets,
      numOfFeatures,
      dto.filters,
      dto.topicKeywords,
      true,
    );
    const scoreByTrainingTweetsExceptUnselect = resultOfTrainingTweetsExceptUnselect.score;

    // 結果を返す
    Logger.log('Done', 'MlService/trainAndValidate');
    const result = {
      trainingResult: {
        logs: trainingResult.logs,
        trainedModelId: trainedModelId,
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
    //console.log(`[MlService] trainAndValidate - Result =`, result);
    return result;
  }

  /**
   * 学習モデルの保存
   * @param topicId トピックのID
   * @param trainedModel 学習モデル
   */
  protected async saveTrainedModel(topicId: number, trainedModel: tf.Sequential): Promise<number> {
    // ファイルを一時ディレクトリへ保存
    const TEMP_DIR_PATH = `/tmp/im-pact-model-save-${new Date().getTime()}`;
    await trainedModel.save(`file://${TEMP_DIR_PATH}`);

    // データベースへ保存するための項目を初期化
    const topic: Topic = new Topic();
    topic.id = topicId;
    const saveModel: MlModel = new MlModel();
    saveModel.topic = topic;

    // 一時ディレクトリからファイルを読みこみ
    saveModel.modelData = await new Promise((resolve, reject) => {
      fs.readFile(`${TEMP_DIR_PATH}/model.json`, (err, data) => {
        if (err) throw reject(err);
        return resolve(data);
      });
    });
    saveModel.modelWeightsData = await new Promise((resolve, reject) => {
      fs.readFile(`${TEMP_DIR_PATH}/weights.bin`, (err, data) => {
        if (err) throw reject(err);
        return resolve(data);
      });
    });

    // データベースへ保存
    const saved = await this.mlModelRepository.save(saveModel);
    return saved.id;
  }

  /**
   * トレーニングのためのデータセットの生成
   * @param trainingTweets お手本分類の結果
   * @param filterSettings ツイートフィルタ設定
   * @param topicKeywords トピックのキーワード (実際に検索が行われるわけではない。ベイジアンフィルタ等で学習からキーワードを除いて精度を上げる場合などに使用される。)
   * @return バッチ加工された学習用データセットおよび検証用データセット
   */
  protected async getTrainingDatasets(trainingTweets: any[], filterSettings: any[], topicKeywords: string[]) {
    // 検証用にデータセットを分割する割合
    const VALIDATION_FRACTION = 0.1;

    // 変数の数を代入する変数
    let numOfFeatures = 0;

    // ツイートフィルタを管理するモジュールを初期化
    const filterManager = new TweetFilterManager(
      this.moduleStorageRepository,
      this.socialAccountRepository,
      filterSettings,
      topicKeywords,
    );

    // 各ツイートフィルタによるバッチ処理を実行
    // (バッチ処理が必要なツイートフィルタがあるため、先にバッチ処理を行っておく)
    Logger.log('Executing batches on tweet filters...', 'MlService/getTrainingDatasets');
    await filterManager.batch();

    // 各ツイートフィルタによる学習処理を実行
    // (学習が必要なツイートフィルタがあるため、先に全ツイートに対する学習を行っておく)
    Logger.log('Training tweets on tweet filters...', 'MlService/getTrainingDatasets');
    for (const tweet of trainingTweets) {
      await filterManager.trainTweet(tweet, tweet.selected);
      if (tweet.selected) {
        await filterManager.trainTweet(tweet, tweet.selected);
      }
    }

    // 各ツイートを反復
    Logger.log('Filtering tweets on tweet filters...', 'MlService/getTrainingDatasets');
    let rawDataset = [];
    for (let tweet of trainingTweets) {
      //console.log(`[MlService] getTrainingDatasets - Tweet: ${tweet.idStr}, ${tweet.selected}`);
      // 当該ツイートに対してツイートフィルタを実行し、分類のための変数を取得
      let allFiltersResult = await filterManager.filterTweet(tweet);
      const allFiltersResultFlat = [].concat(...allFiltersResult);
      numOfFeatures = allFiltersResultFlat.length;
      // 生データセットの行を生成
      let rawDataRow = [];
      rawDataRow = rawDataRow.concat(allFiltersResultFlat);
      rawDataRow.push(tweet.selected ? 1 : 0);
      // 生データセットへ追加
      rawDataset.push(rawDataRow);
    }

    // 生データセットを複製してシャッフル
    Logger.log('Generating datasets...', 'MlService/getTrainingDatasets');
    let shuffledRawDataset = rawDataset.slice();
    tf.util.shuffle(shuffledRawDataset);

    // データセットを学習用と検証用へ分割
    const numofValidationExamples = Math.round(rawDataset.length * VALIDATION_FRACTION);
    const numofTrainingExamples = rawDataset.length - numofValidationExamples;
    const trainingRawDataset = shuffledRawDataset.slice(0, numofTrainingExamples);
    const validationRawDataset = shuffledRawDataset.slice(numofTrainingExamples);

    // データセットを X および Y へ分割し、feature mapping transformations を適用
    const trainingX = tf.data.array(trainingRawDataset.map(r => r.slice(0, numOfFeatures)));
    const validationX = tf.data.array(validationRawDataset.map(r => r.slice(0, numOfFeatures)));
    const trainingY = tf.data.array(trainingRawDataset.map(r => this.flatOneHot(r[numOfFeatures])));
    const validationY = tf.data.array(validationRawDataset.map(r => this.flatOneHot(r[numOfFeatures])));

    // x および y をデータセットへ再結合
    let trainingDataset = tf.data.zip({ xs: trainingX, ys: trainingY });
    let validationDataset = tf.data.zip({ xs: validationX, ys: validationY });

    // デバッグ出力
    /*console.log(`[MlService] getTrainingDatasets - Dataset:`);
    (await trainingDataset.toArray()).forEach(row => {
      console.log(row);
    });*/

    // データセットに対してバッチを実行
    const BATCH_SIZE = 16;
    Logger.log('Applying batch to dataset...', 'MlService/getTrainingDatasets');
    trainingDataset = trainingDataset.batch(BATCH_SIZE);
    validationDataset = validationDataset.batch(BATCH_SIZE);
    Logger.log(
      `Batch applied... ${JSON.stringify(trainingDataset)}, ${JSON.stringify(validationDataset)}`,
      'MlService/getTrainingDatasets',
    );

    // データセットを返す
    Logger.log('Done', 'MlService/getTrainingDatasets');
    return {
      trainingDataset: trainingDataset,
      validationDataset: validationDataset,
      numOfFeatures: numOfFeatures,
    };
  }

  protected flatOneHot(index: any) {
    // 目的変数 ('accept' または 'reject' の2種類) を行列形式へエンコード
    return Array.from(tf.oneHot([index], 2).dataSync());
  }

  /**
   * 学習モデルの生成
   * @param trainingDataset 学習用データセット
   * @param validationDataset 検証用データセット
   * @param numOfFeatures データセットの説明変数の数
   * @return 生成されたモデル
   */
  protected async trainModel(trainingDataset: any, validationDataset: any, numOfFeatures: number) {
    // トレーニングのためのパラメータ
    const TRAIN_EPOCHS = 30;
    const LEARNING_RATE = 0.1;

    // 学習モデルのトポロジを定義
    console.log(`[MlService] trainModel - Making toporogy...`);
    const model = tf.sequential();
    model.add(
      tf.layers.dense({
        // 隠れ層のユニット数
        units: 10,
        // 活性化関数
        activation: 'sigmoid', // relu = 67
        // 説明変数の数
        inputShape: [numOfFeatures],
      }),
    );

    // 分類結果を2種類 ('accept' または 'reject') とするために出力層のユニット数を2に設定
    model.add(tf.layers.dense({ units: 2, activation: 'softmax' }));

    // 学習モデルの層のサマリを出力 (デバッグ用)
    model.summary();

    console.log(`[MlService] trainModel - Compiling model...`);

    // モデルをコンパイル
    model.compile({
      // 最適化アルゴリズムを設定
      optimizer: tf.train.adam(LEARNING_RATE),
      // 損失関数を設定
      loss: 'categoricalCrossentropy',
      // 評価関数を設定
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
   * @oaram filterSettings ツイートフィルタの設定
   * @param topicKeywords トピックのキーワード  (実際に検索が行われるわけではない。ベイジアンフィルタ等で学習からキーワードを除いて精度を上げる場合などに使用される。)
   * @param excludeUnselectedTweets お手本分類でユーザによって選択されなかったツイートを検証から除外するか
   * @return 検証および分類の結果
   */
  protected async validateByTrainingTweets(
    trainedModel: tf.Sequential,
    tweets: any[],
    numOfFeatures: number,
    filterSettings: any[],
    topicKeywords: string[],
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
    const filterManager = new TweetFilterManager(
      this.moduleStorageRepository,
      this.socialAccountRepository,
      filterSettings,
      topicKeywords,
    );

    // 検証するツイートを反復
    let i = 0;
    for (let tweet of validationTweets) {
      // 当該ツイートに対してツイートフィルタを実行し、分類のための変数を取得
      let allFiltersResult = await filterManager.filterTweet(tweet);
      const allFiltersResultFlat = [].concat(...allFiltersResult);
      // 指定された学習モデルにより予測を実行
      const predictedClass = (trainedModel.predict(tf.tensor2d(allFiltersResultFlat, [1, numOfFeatures])) as tf.Tensor)
        .argMax(-1)
        .dataSync()[0];

      // 予測した答えを追加
      validationTweets[i].predictedSelect = predictedClass == 1;
      // ツイートフィルタの実行結果を追加
      validationTweets[i].filtersResult = allFiltersResultFlat;
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
   * 指定されたツイートの分類
   * @param trainedModelId 学習モデルのID (データベースに保存されたもの)
   * @param tweets 分類するツイート
   * @return 分類の結果
   */
  async predictTweets(
    trainedModelId: number,
    tweets: any[],
    filterSettings: any[],
    topicKeywords: string[],
  ): Promise<any[]> {
    // 学習モデルを一時ディレクトリへ書き出し
    const mlModel = await this.mlModelRepository.findOne(trainedModelId);
    if (!mlModel) {
      throw new Error('Invalid trainedModelId');
    }
    const TEMP_DIR_PATH = `/tmp/im-pact-model-load-${trainedModelId}`;
    if (!fs.existsSync(TEMP_DIR_PATH)) {
      fs.mkdirSync(TEMP_DIR_PATH);
      fs.writeFileSync(`${TEMP_DIR_PATH}/model.json`, mlModel.modelData);
      fs.writeFileSync(`${TEMP_DIR_PATH}/weights.bin`, mlModel.modelWeightsData);
    }

    // 学習モデルの読み込み
    const trainedModel = await tf.loadLayersModel(`file://${TEMP_DIR_PATH}/model.json`);

    // フィルタマネージャを初期化
    const filterManager = new TweetFilterManager(
      this.moduleStorageRepository,
      this.socialAccountRepository,
      filterSettings,
      topicKeywords,
    );

    // 分類するツイートを反復
    let i = 0;
    for (let tweet of tweets) {
      // 当該ツイートに対してツイートフィルタを実行し、分類のための変数を取得
      let allFiltersResult = await filterManager.filterTweet(tweet);
      const allFiltersResultFlat = [].concat(...allFiltersResult);
      // 指定された学習モデルにより予測を実行
      const predictedClass = (trainedModel.predict(
        tf.tensor2d(allFiltersResultFlat, [1, allFiltersResultFlat.length]),
      ) as tf.Tensor)
        .argMax(-1)
        .dataSync()[0];

      // 予測した答えを追加
      tweets[i].predictedSelect = predictedClass == 1;
      // ツイートフィルタの実行結果を追加
      tweets[i].filtersResult = allFiltersResultFlat;
      i++;

      console.log(`[MlService] predictTweets - tweet = ${tweet.idStr}, predictedClass = ${predictedClass}`);
    }

    return tweets;
  }
}
