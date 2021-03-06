import { Injectable, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import { SocialAccount } from '../../social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TrainAndValidateDto } from './dto/train-and-validate.dto';
import { TweetFilterManager } from './modules/tweet-filter-manager';
import { ModuleStorage } from './entities/module-storage.entity';
import { MlModel, NormalizationConstants as NormalizationConstant } from './entities/ml-model.entity';
import { Topic } from '../entities/topic.entity';
import { ActionManager } from './modules/action-manager';
import { CrawledTweet } from './entities/crawled-tweet.entity';
import {
  TweetFilterResultWithMultiValues,
  TweetFilterResultSummaryWithEvidenceText,
  TweetFilterResultSummaryWithEvidenceImages,
} from './modules/tweet-filters/interfaces/tweet-filter.interface';
import { FilterPatternSettings } from '../entities/filter-pattern.entity';

@Injectable()
export class MlService {
  constructor(
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
    @InjectRepository(ModuleStorage)
    private moduleStorageRepository: Repository<ModuleStorage>,
    @InjectRepository(MlModel)
    private mlModelRepository: Repository<MlModel>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
  ) {}

  /**
   * 利用可能なアクションの取得
   */
  async getAvailableActions() {
    const actionManager = new ActionManager(this.moduleStorageRepository, null, this.socialAccountRepository, [], []);
    const actionNames = await actionManager.getAvailableActionNames();

    const actions = {};
    for (const actionName of actionNames) {
      let mod = null;
      try {
        mod = await actionManager.getModule(actionName, null, null, null);
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
        version: '1.0.0', // TODO:
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
   * トレーニングおよび検証
   * (お手本分類の結果と、ツイートフィルタ設定をもとにデータセットを生成し、分類器の学習モデルを生成・保存し、検証を行う)
   * @return トレーニングおよび検証の結果
   */
  async trainAndValidate(dto: TrainAndValidateDto) {
    // データベース上のツイートとマージ
    const trainingTweets = [];
    for (const tweet of dto.trainingTweets) {
      const crawledTweet = this.crawledTweetRepository.findOne(tweet.id) as any;
      if (crawledTweet && crawledTweet.idStr === tweet.idStr) {
        crawledTweet.selected = tweet.selected;
        trainingTweets.push(crawledTweet);
      } else {
        trainingTweets.push(tweet);
      }
    }

    // ツイートフィルタの初回処理を実行
    Logger.log('Executing initial process for tweet filters...', 'MlService/trainAndValidate');
    await this.execInitialProcessOfTweetFilters(trainingTweets, dto.filters, dto.topicKeywords);

    // データセットを生成
    Logger.log('getTrainingDatasets...', 'MlService/trainAndValidate');
    let generatedDatasets = await this.getTrainingDatasets(trainingTweets, dto.filters, dto.topicKeywords);

    // データセットの変数の数を取得
    const numOfFeatures = generatedDatasets.numOfFeatures;

    // 学習モデルを生成
    Logger.log('Training model...', 'MlService/trainAndValidate');
    const trainingResult = await this.trainModel(
      generatedDatasets.trainingDataset,
      generatedDatasets.validationDataset,
      numOfFeatures,
      dto.filterPatternSettings,
    );
    const trainedModel = trainingResult.model;

    // 学習モデルをデータベースへ保存
    const trainedModelId = await this.saveTrainedModel(
      dto.topicId,
      trainedModel,
      generatedDatasets.normalizationConstants,
    );

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
      trainingTweets,
      numOfFeatures,
      dto.filters,
      dto.topicKeywords,
      generatedDatasets.normalizationConstants,
      true, // Embedding Projector のためのベクトルデータの出力を有効化
    );
    const scoreByTrainingTweets = resultOfTrainingTweets.score;

    // お手本分類の結果のうち、選択済みのツイートのみのスコアを算出
    let numOfTrainingTweetsExceptUnselect = 0;
    let scoreByTrainingTweetsExceptUnselect = 0;
    for (const tweet of resultOfTrainingTweets.tweets) {
      if (!tweet.selected) continue;
      numOfTrainingTweetsExceptUnselect++;
    }
    for (const tweet of resultOfTrainingTweets.tweets) {
      if (!tweet.selected || tweet.selected != tweet.predictedSelect) {
        continue;
      }
      scoreByTrainingTweetsExceptUnselect += 100 / numOfTrainingTweetsExceptUnselect;
    }
    scoreByTrainingTweetsExceptUnselect = Math.ceil(scoreByTrainingTweetsExceptUnselect);

    // 総合スコアを算出
    const score = Math.min(
      scoreByValidationDataset,
      scoreByTrainingDataset,
      scoreByTrainingTweets,
      scoreByTrainingTweetsExceptUnselect,
    );

    // 結果を返す
    Logger.log(
      `Done... score = ${score} (ValidationDataset = ${scoreByValidationDataset}, TrainingDataset = ${scoreByTrainingDataset}, TrainingTweets = ${scoreByTrainingTweets}, TrainingTweetsExceptUnselect = ${scoreByTrainingTweetsExceptUnselect})`,
      'MlService/trainAndValidate',
    );
    const result = {
      trainingResult: {
        logs: trainingResult.logs,
        trainedModelId: trainedModelId,
      },
      validationResult: {
        score: score,
        scoreByValidationDataset: scoreByValidationDataset,
        scoreByTrainingDataset: scoreByTrainingDataset,
        scoreByTrainingTweets: scoreByTrainingTweets,
        scoreByTrainingTweetsExceptUnselect: scoreByTrainingTweetsExceptUnselect,
        embedding: {
          vectorsTsv: this.getEmbeddingVectorsTsvByEmbedding(resultOfTrainingTweets.embedding),
          metadatasTsv: this.getEmbeddingMetadatasTsvByEmbedding(resultOfTrainingTweets.embedding),
        },
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
   * @param normalizationConstants 分類時に説明変数を正規化するための情報
   */
  protected async saveTrainedModel(
    topicId: number,
    trainedModel: tf.Sequential,
    normalizationConstants: NormalizationConstant[],
  ): Promise<number> {
    // ファイルを一時ディレクトリへ保存
    const TEMP_DIR_PATH = `/tmp/im-pact-model-save-${new Date().getTime()}`;
    await trainedModel.save(`file://${TEMP_DIR_PATH}`);

    // データベースへ保存するための項目を初期化
    const topic: Topic = new Topic();
    topic.id = topicId;
    const saveModel: MlModel = new MlModel();
    saveModel.topic = topic;
    saveModel.normalizationConstants = normalizationConstants;

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
   * ツイートフィルタの初回処理
   * @param trainingTweets お手本分類の結果 (初回学習が行われる)
   * @param filterSettings ツイートフィルタ設定
   * @param topicKeywords トピックのキーワード (実際に検索が行われるわけではない。ベイジアンフィルタ等で学習からキーワードを除いて精度を上げる場合などに使用される。)
   */
  protected async execInitialProcessOfTweetFilters(
    trainingTweets: any[],
    filterSettings: any[],
    topicKeywords: string[],
  ): Promise<void> {
    // ツイートフィルタを管理するモジュールを初期化
    const filterManager = new TweetFilterManager(
      this.moduleStorageRepository,
      this.crawledTweetRepository,
      this.socialAccountRepository,
      filterSettings,
      topicKeywords,
    );

    // ツイートフィルタによる初回処理を実行
    await filterManager.execInitialProcess(trainingTweets);
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

    // ツイートフィルタを管理するモジュールを初期化
    const filterManager = new TweetFilterManager(
      this.moduleStorageRepository,
      this.crawledTweetRepository,
      this.socialAccountRepository,
      filterSettings,
      topicKeywords,
    );

    // 各ツイートフィルタによるバッチ処理を実行
    // (バッチ処理が必要なツイートフィルタがあるため、バッチ処理を行っておく)
    Logger.log('Executing batches on tweet filters...', 'MlService/getTrainingDatasets');
    await filterManager.batch();

    // 説明変数の名前を列挙するための配列を初期化
    let schemaOfFilterValues: {
      filterName: string;
      filterId: string;
      keyOfValue: string;
    }[] = null;

    // 各ツイートを反復
    Logger.log('Filtering tweets on tweet filters...', 'MlService/getTrainingDatasets');
    let rawDataset = [];
    for (let tweet of trainingTweets) {
      // 当該ツイートに対して全ツイートフィルタを実行
      let filterResults: { filterName: string; filterId: string; result: TweetFilterResultWithMultiValues }[] = [];
      try {
        filterResults = await filterManager.filterTweet(tweet);
      } catch (e) {
        Logger.error('Error occurred on tweet filters...', e.stack, 'MlService/getTrainingDatasets');
        continue;
      }

      // 全ツイートフィルタの結果から分類のための変数 (説明変数) を抽出
      const filterValues = this.getFilterValuesByFilterResults(filterResults);
      // 生データセットの行を生成
      let rawDataRow = [];
      rawDataRow = rawDataRow.concat(filterValues);
      rawDataRow.push(tweet.selected ? 1 : 0);
      // 生データセットへ追加
      rawDataset.push(rawDataRow);

      // 説明変数の名前を残しておく
      if (schemaOfFilterValues == null) {
        schemaOfFilterValues = [];
        for (const result of filterResults) {
          for (const key of Object.keys(result.result.values)) {
            schemaOfFilterValues.push({
              filterId: result.filterId,
              filterName: result.filterName,
              keyOfValue: key,
            });
          }
        }
      }
    }

    // 説明変数が存在するか確認
    if (!schemaOfFilterValues || schemaOfFilterValues.length == 0) {
      throw new Error('There is no filter values');
    }

    // 生データセットの説明変数を Z-score normalization で正規化
    // (NOTE: 生データセットの各行の最後の要素は、目的変数であるため、正規化しない)
    const normalizationConstants: NormalizationConstant[] = [];
    for (let column = 0; column < schemaOfFilterValues.length; column++) {
      // 当該説明変数がカテゴリカル変数か否かを確認
      if (rawDataset[0][column] instanceof Array) {
        // カテゴリカル変数は正規化しない
        continue;
      }

      // 当該説明変数の値および合計値を取得
      const values = [];
      let sum = 0.0;
      for (let i = 0, l = rawDataset.length; i < l; i++) {
        values.push(rawDataset[i][column]);
        sum += rawDataset[i][column];
      }

      // 当該説明変数の平均値を算出
      const mean = sum / rawDataset.length;

      // 当該説明変数の標準偏差を算出
      const v = values
        .map(value => {
          const diff = value - mean;
          return diff ** 2;
        })
        .reduce((previous, current) => {
          return previous + current;
        });
      const std = Math.sqrt(v / rawDataset.length);

      Logger.log(
        `Normalize column ${column} with z-score normalization... sum = ${sum}, mean = ${mean}, std = ${std}`,
        'MlService/getTrainingDatasets',
      );

      // 当該説明変数を正規化
      for (let i = 0, l = rawDataset.length; i < l; i++) {
        rawDataset[i][column] = (rawDataset[i][column] - mean) / std;
      }

      // 今後の分類時に正規化を行うための情報を付加
      const schema = schemaOfFilterValues[column];
      normalizationConstants[column] = {
        filterName: schema.filterName,
        filterId: schema.filterId,
        keyOfValue: schema.keyOfValue,
        meanOfValue: mean,
        stdOfValue: std,
      };
    }

    // 生データセットの各行をフラットへ
    // (One Hot Encoding された説明変数は配列になっているので、フラットへ変換)
    rawDataset = rawDataset.map(dataRow => {
      return [].concat(...dataRow);
    });

    // 説明変数の数を取得
    // (NOTE:  生データセットの各行の最後の要素は、目的変数であるため、1つ減らす)
    let numOfFeatures = rawDataset[0].length - 1;

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
    const BATCH_SIZE = 8;
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
      normalizationConstants: normalizationConstants,
    };
  }

  protected flatOneHot(index: any) {
    return Array.from(tf.oneHot([index], 3).dataSync());
  }

  /**
   * 指定されたツイートフィルタの実行結果の配列から値の配列を返すメソッド
   * @param filterResults ツイートフィルタの実行結果の配列
   * @return 値 (ツイートを分類するための変数) の配列
   */
  protected getFilterValuesByFilterResults(
    filterResults: { filterName: string; result: TweetFilterResultWithMultiValues }[],
  ): number[] {
    const values = [];
    for (const filterResult of filterResults) {
      for (const fiterValueKey of Object.keys(filterResult.result.values)) {
        values.push(filterResult.result.values[fiterValueKey].value);
      }
    }
    return values;
  }

  /**
   * 学習モデルの生成
   * @param trainingDataset 学習用データセット
   * @param validationDataset 検証用データセット
   * @param numOfFeatures データセットの変数の数
   * @param settings フィルタパターンの設定
   * @return 生成されたモデル
   */
  protected async trainModel(
    trainingDataset: any,
    validationDataset: any,
    numOfFeatures: number,
    settings: FilterPatternSettings,
  ) {
    // ハイパーパラメータを設定
    const learningRate = settings.mlLearningRate || 0.1;
    const numOfEpochs = settings.numOfMlEpochs || 30;
    const lossFunction = settings.mlLossFunction || 'categoricalCrossentropy';

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

    console.log(
      `[MlService] trainModel - Compiling model... (learningRate = ${learningRate}, lossFunction = ${lossFunction})`,
    );
    const optimizer = tf.train.adam(learningRate);
    model.compile({
      optimizer: optimizer,
      loss: lossFunction,
      metrics: ['accuracy'],
    });

    // 学習の実行
    console.log(`[MlService] trainModel - Executing fit datset... (epochs = ${numOfEpochs})`);
    const logs: tf.Logs[] = [];
    await model.fitDataset(trainingDataset, {
      epochs: numOfEpochs,
      validationData: validationDataset,
      callbacks: {
        onEpochEnd: async (epoch, epochLog) => {
          logs.push(epochLog);
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
    const xData = await xTest.data();
    // 検証用データセットの正しい答えを取得
    const yTrue = await yTest.argMax(-1).data();
    let predictOutRaw = trainedModel.predict(xTest) as tf.Tensor;
    // 検証用データセットの予測した答えを取得
    const yPred = await predictOutRaw.argMax(-1).data();
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
   * @param normalizationConstants 分類時に説明変数を正規化するための情報
   * @param excludeUnselectedTweets お手本分類でユーザによって選択されなかったツイートを検証から除外するか
   * @param enableDumpEmbedding 埋め込みデータの出力を行うか (Embedding Projector による分析用)
   * @return 検証および分類の結果
   */
  protected async validateByTrainingTweets(
    trainedModel: tf.Sequential,
    tweets: any[],
    numOfFeatures: number,
    filterSettings: any[],
    topicKeywords: string[],
    normalizationConstants: NormalizationConstant[],
    enableDumpEmbedding = false,
  ): Promise<{
    score: number;
    tweets: any[];
    embedding: { vectors: number[][]; metadataColumns: string[]; metadatas: string[][] };
  }> {
    // 変数を初期化
    let score = 0;
    const numOfTweets = tweets.length;

    // 埋め込みデータの初期化 (Embedding Projector による分析用)
    let embedding: {
      vectors: number[][];
      metadataColumns: string[];
      metadatas: string[][];
    } = null;

    if (enableDumpEmbedding) {
      embedding = {
        vectors: [],
        metadataColumns: [],
        metadatas: [],
      };
    }

    // フィルタマネージャを初期化
    const filterManager = new TweetFilterManager(
      this.moduleStorageRepository,
      this.crawledTweetRepository,
      this.socialAccountRepository,
      filterSettings,
      topicKeywords,
    );

    // 検証するツイートを反復
    let i = 0;
    for (let tweet of tweets) {
      // 当該ツイートに対して全ツイートフィルタを実行
      let filterResults: { filterName: string; result: TweetFilterResultWithMultiValues }[] = [];
      try {
        filterResults = await filterManager.filterTweet(tweet);
      } catch (e) {
        Logger.error('Error occurred on tweet filters...', e.stack, 'MlService/validateByTrainingTweets');
        continue;
      }

      // 全ツイートフィルタの結果から分類のための変数 (説明変数) を抽出
      let filterValues = this.getFilterValuesByFilterResults(filterResults);

      // 説明変数を Z-score normalization で正規化
      for (let column = 0, l = filterValues.length; column < l; column++) {
        const normalizationConstant = normalizationConstants[column];
        if (!normalizationConstant) continue;
        filterValues[column] =
          (filterValues[column] - normalizationConstant.meanOfValue) / normalizationConstant.stdOfValue;
      }

      // 説明変数の配列をフラットへ
      // (One Hot Encoding された説明変数は配列になっているので、フラットへ変換)
      filterValues = [].concat(...filterValues);
      const numOfFeatures = filterValues.length;

      // 指定された学習モデルにより予測を実行
      const predictResult = trainedModel.predict(tf.tensor2d(filterValues, [1, numOfFeatures])) as tf.Tensor;
      let predictResultVectors = null;
      if (embedding) {
        predictResultVectors = await predictResult.data();
      }
      const predictedClass = (await predictResult.argMax(-1).data())[0];

      // 予測した答えを追加
      tweets[i].predictedSelect = predictedClass == 1;
      // ツイートフィルタの実行結果を追加
      tweets[i].filtersResult = filterResults;

      // 予測した答えが正しいか判定
      const correctClass = tweet.selected ? 1 : 0;
      const isCorrect = correctClass === predictedClass;

      // 埋め込みデータの追加 (Embedding Projector による分析用)
      if (embedding) {
        // 埋め込みデータのベクトルを追加
        const vectors = [];
        for (let i = 0, l = predictResultVectors.length; i < l; i++) {
          vectors.push(predictResultVectors[i]);
        }
        embedding.vectors.push(vectors);

        // 埋め込みデータのメタデータのカラム名を追加
        if (embedding.metadataColumns.length === 0) {
          embedding.metadataColumns = ['Is correct', 'Correct class', 'Predicted class'];
          // 各ツイートフィルタの値 (説明変数) の名前
          for (const result of filterResults) {
            const filterName =
              10 < result.filterName.length ? result.filterName.substring(0, 7) + '...' : result.filterName;
            embedding.metadataColumns.push(filterName + '/evidence');

            for (const key of Object.keys(result.result.values)) {
              const columnName = 17 < key.length ? key.substring(0, 14) + '...' : key;
              embedding.metadataColumns.push(filterName + '/' + columnName);
            }
          }
        }

        // 埋め込みデータのメタデータを初期化
        const metadata = [];

        // 埋め込みデータのメタデータ - 予測した答えが正しいか否か
        metadata.push(isCorrect);

        // 埋め込みデータのメタデータ - お手本分類における選択状況
        metadata.push(tweet.selected ? 'accept' : 'reject');

        // 埋め込みデータのメタデータ - ディープラーニング分類器による選択状況
        metadata.push(predictedClass == 1 ? 'accept' : 'reject');

        // 埋め込みデータのメタデータ - 各ツイートフィルタ (説明変数)
        for (const result of filterResults) {
          let evidence = 'N/A';
          if (
            (result.result.summary as TweetFilterResultSummaryWithEvidenceImages).evidenceImageUrls &&
            1 <= (result.result.summary as TweetFilterResultSummaryWithEvidenceImages).evidenceImageUrls.length
          ) {
            evidence = (result.result.summary as TweetFilterResultSummaryWithEvidenceImages).evidenceImageUrls[0];
          } else if ((result.result.summary as TweetFilterResultSummaryWithEvidenceText).evidenceText) {
            evidence = (result.result.summary as TweetFilterResultSummaryWithEvidenceText).evidenceText;
          }
          metadata.push(evidence.replace(/\n/g, ''));

          for (const key of Object.keys(result.result.values)) {
            metadata.push(this.convertFilterResultValueToString(result.result.values[key].value));
          }
        }

        // 埋め込みデータのメタデータを追加
        embedding.metadatas.push(metadata);
      }

      // 次へ
      console.log(
        `[MlService] validateByTrainingTweets - tweet = ${tweet.idStr}, predictedClass = ${predictedClass}, correctClass = ${correctClass}`,
      );
      i++;
      if (!isCorrect) {
        // 不正解ならば、次へ
        continue;
      }

      // 検証の点数を加点
      score += 100 / numOfTweets;
    }

    return {
      score: Math.ceil(score),
      tweets: tweets,
      embedding: embedding,
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
      this.crawledTweetRepository,
      this.socialAccountRepository,
      filterSettings,
      topicKeywords,
    );

    // 分類するツイートを反復
    let i = 0;
    for (let tweet of tweets) {
      // 当該ツイートに対して全ツイートフィルタを実行
      let filterResults: { filterName: string; result: TweetFilterResultWithMultiValues }[] = [];
      try {
        filterResults = await filterManager.filterTweet(tweet);
      } catch (e) {
        Logger.error('Error occurred on tweet filters...', e.stack, 'MlService/getTrainingDatasets');
        continue;
      }

      // 全ツイートフィルタの結果から分類のための変数 (説明変数) を抽出
      let filterValues = this.getFilterValuesByFilterResults(filterResults);

      // 説明変数を Z-score normalization で正規化
      const normalizationConstants = mlModel.normalizationConstants;
      for (let column = 0, l = filterValues.length; column < l; column++) {
        const normalizationConstant = normalizationConstants[column];
        if (!normalizationConstant) continue;
        filterValues[column] =
          (filterValues[column] - normalizationConstant.meanOfValue) / normalizationConstant.stdOfValue;
      }

      // 説明変数の配列をフラットへ
      // (One Hot Encoding された説明変数は配列になっているので、フラットへ変換)
      filterValues = [].concat(...filterValues);
      const numOfFeatures = filterValues.length;

      // 指定された学習モデルにより予測を実行
      const predictedClass = (trainedModel.predict(tf.tensor2d(filterValues, [1, numOfFeatures])) as tf.Tensor)
        .argMax(-1)
        .dataSync()[0];

      // 予測した答えを追加
      tweets[i].predictedSelect = predictedClass == 1;
      // ツイートフィルタの実行結果を追加
      tweets[i].filtersResult = filterResults;
      i++;

      console.log(`[MlService] predictTweets - tweet = ${tweet.idStr}, predictedClass = ${predictedClass}`);
    }

    return tweets;
  }

  /**
   * 指定された埋め込みデータによるベクトルTSVの生成 (Embedding Projector による分析用)
   */
  getEmbeddingVectorsTsvByEmbedding(embedding: {
    vectors: number[][];
    metadataColumns: string[];
    metadatas: string[][];
  }): string {
    if (!embedding || !embedding.vectors) {
      return null;
    }

    let tsv = String();
    for (let row = 0, rows = embedding.vectors.length; row < rows; row++) {
      tsv += embedding.vectors[row].join('\t') + '\r\n';
    }

    return tsv;
  }

  /**
   * 指定された埋め込みデータによるメタデータTSVの生成 (Embedding Projector による分析用)
   */
  getEmbeddingMetadatasTsvByEmbedding(embedding: {
    vectors: number[][];
    metadataColumns: string[];
    metadatas: string[][];
  }): string {
    if (!embedding || !embedding.metadataColumns) {
      return null;
    }

    let tsv = embedding.metadataColumns.join('\t') + '\r\n';
    for (let row = 0, rows = embedding.metadatas.length; row < rows; row++) {
      tsv += embedding.metadatas[row].join('\t') + '\r\n';
    }

    return tsv;
  }

  /**
   * 指定されたツイートフィルタの実行結果からの文字列の取得
   * @param value ツイートフィルタの実行結果
   * @return 整形された文字列 (例: "0.1000" or "1")
   */
  convertFilterResultValueToString(value: number[] | number): string {
    if (value instanceof Array) {
      // One Hot Coding された値 (カテゴリカル変数) ならば、文字列 (例: "0") にして返す
      const index = value.findIndex((val: number) => val === 1);
      if (index === -1) return '-';
      return String(index);
    }

    if (Number.isInteger(value)) {
      // 整数ならば、そのまま文字列 (例: "100") にして返す
      return String(value);
    }

    // 小数ならば、小数点以下4桁の文字列 (例: "0.1000") にして返す
    return value.toFixed(4);
  }
}
