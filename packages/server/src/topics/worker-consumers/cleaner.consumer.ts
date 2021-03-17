import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawledTweet } from '../ml/entities/crawled-tweet.entity';
import { ClassifiedTweet } from '../ml/entities/classified-tweet.entity';
import { Topic } from '../entities/topic.entity';
import { MlModel } from '../ml/entities/ml-model.entity';

/**
 * クリーンアップに関するキューを処理するためのコンシューマ
 */
@Processor('cleaner')
export class CleanerConsumer {
  // クリーンアップを実行すべきか判断するしきい値の割合
  // (例: 指定上限が 7500 件で、しきい値の割合が 0.9 の場合、現在の行数が 6750件を超えていれば、クリーンアップを実行する)
  private AUTO_CLEANUP_THRESOLD_RATE_FOR_DB_ROWS = 0.9;

  // クリーンアップの削除率
  // (例: 指定上限が 7500 件で、削除率が 0.9 ならば、全体の行数が 6750件になるまで削除を行う)
  private AUTO_CLEANUP_DELETE_RATE_FOR_DB_ROWS = 0.9;

  // エンティティごとの行数の配分定義
  private DB_ROWS_RATE_ALLOCATION_EACH_ENTITIES = {
    crawledTweet: 0.49, // 全体で 7500 行ならば... 3,650行
    classifiedTweetAccept: 0.28, // 〃 ならば... 2,100行
    classifiedTweetReject: 0.2, // 〃 ならば... 1,500行
    mlModel: 0.005, // 〃 ならば... 37行
    // 残り (moduleStorage): 213行
  };

  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
    @InjectRepository(ClassifiedTweet)
    private classifiedTweetRepository: Repository<ClassifiedTweet>,
    @InjectRepository(MlModel)
    private mlModelRepository: Repository<MlModel>,
  ) {}

  /**
   * データベースのクリーンアップのためのジョブの処理
   * (@nestjs/bull から 'cleaner' キューを介して呼び出される)
   * @param job ジョブ
   */
  @Process()
  async execJob(job: Job<any>) {
    Logger.debug(`Job starting... (ID: ${job.id})`, 'CleanerConsumer/execJob');

    if (!process.env.AUTO_CLEANUP_MAX_DB_ROWS || process.env.AUTO_CLEANUP_MAX_DB_ROWS.length === 0) {
      Logger.debug(
        `Job completed because auto cleanup is disabled (AUTO_CLEANUP_MAX_DB_ROWS is not defined) (ID: ${job.id})`,
        'CleanerConsumer/execJob',
      );
      return;
    }

    const maxDBRows = parseInt(process.env.AUTO_CLEANUP_MAX_DB_ROWS, 10);
    if (Number.isNaN(maxDBRows)) {
      Logger.error('MAX_DB_ROWS_PER_TOPIC is invalid value', 'CleanerConsumer/execJob');
      return;
    }

    try {
      if (!(await this.shouldCleanupDatabase(maxDBRows))) {
        Logger.debug(`Job completed because cleanup is not required (ID: ${job.id})`, 'CleanerConsumer/execJob');
        return;
      }

      const result = await this.execCleanupDatabase(maxDBRows);
      Logger.debug(`Job completed... (ID: ${job.id})`, 'CleanerConsumer/execJob');
      return result;
    } catch (e) {
      Logger.error(`Error has occurred in job... (ID: ${job.id})`, e.stack, 'CleanerConsumer/execJob');
      throw e;
    }
  }

  /**
   * データベースのクリーンアップが必要か否かの取得
   * @param maxDBRows データベース行数の上限
   * @return 上限を元にしたしきい値に達しているか否か
   */
  async shouldCleanupDatabase(maxDBRows: number): Promise<boolean> {
    if (!maxDBRows) return false;

    return true;

    // しきい値を取得
    const thresholdNumOfRows = maxDBRows * this.AUTO_CLEANUP_THRESOLD_RATE_FOR_DB_ROWS;
    const thresholdNumOfRowsOfCrawledTweet =
      this.DB_ROWS_RATE_ALLOCATION_EACH_ENTITIES.crawledTweet * thresholdNumOfRows;
    const thresholdNumOfRowsOfClassifiedTweetAccept =
      this.DB_ROWS_RATE_ALLOCATION_EACH_ENTITIES.classifiedTweetAccept * thresholdNumOfRows;
    const thresholdNumOfRowsOfClassifiedTweetReject =
      this.DB_ROWS_RATE_ALLOCATION_EACH_ENTITIES.classifiedTweetReject * thresholdNumOfRows;
    const thresholdNumOfRowsOfMlModel = this.DB_ROWS_RATE_ALLOCATION_EACH_ENTITIES.mlModel * thresholdNumOfRows;

    // データベース行数がしきい値に達しているかを返す
    if (
      thresholdNumOfRowsOfCrawledTweet <= (await this.crawledTweetRepository.count()) ||
      thresholdNumOfRowsOfClassifiedTweetAccept + thresholdNumOfRowsOfClassifiedTweetReject <=
        (await this.classifiedTweetRepository.count()) ||
      thresholdNumOfRowsOfMlModel <= (await this.mlModelRepository.count())
    ) {
      return true;
    }

    return false;
  }

  /**
   * データベースのクリーンアップ
   * (指定された行数に収まるようにデータベースを整理する)
   * @param maxDBRows データベース行数の上限
   */
  async execCleanupDatabase(maxDBRows: number) {
    // 各エンティティのクリーンアップ後の行数を取得
    const cleanedUpNumOfRows = maxDBRows * this.AUTO_CLEANUP_DELETE_RATE_FOR_DB_ROWS;
    const cleanedUpNumOfRowsOfCrawledTweet =
      this.DB_ROWS_RATE_ALLOCATION_EACH_ENTITIES.crawledTweet * cleanedUpNumOfRows;

    // CralwledTweet エンティティを検索して削除
    const numOfExpectedRemoveItems = (await this.crawledTweetRepository.count()) - cleanedUpNumOfRowsOfCrawledTweet;
    if (0 < numOfExpectedRemoveItems) {
      const removeItems = await this.crawledTweetRepository.find({
        order: {
          crawledAt: 'ASC',
        },
        take: numOfExpectedRemoveItems,
      });
      let i = 0;
      for (const item of removeItems) {
        Logger.debug(`Delete CrawledTweet... (id = ${item.id})`, 'CleanerConsumer/execCleanupDatabase');
        await item.remove();
        i++;
      }
      Logger.log(`Deleted ${i} items from CrawledTweet.`, 'CleanerConsumer/execCleanupDatabase');
    }

    // Classified エンティティを検索して削除
    await this.execCleanupClassifiedTweets(maxDBRows, 'accept');
    await this.execCleanupClassifiedTweets(maxDBRows, 'reject');

    // MlModel エンティティを検索して削除
    await this.execCleanupMlModel(maxDBRows);
  }

  /**
   * 学習モデルのクリーンアップ
   * (指定された行数に収まるように、または使われていない学習モデルを全て削除するまで、データベースから学習モデルを削除する)
   * @param maxDBRows データベース行数の上限
   */
  protected async execCleanupMlModel(maxDBRows: number) {
    // エンティティのクリーンアップ後の行数を取得
    const cleanedUpNumOfRows = maxDBRows * this.AUTO_CLEANUP_DELETE_RATE_FOR_DB_ROWS;
    const cleanedUpNumOfRowsOfMlModel = this.DB_ROWS_RATE_ALLOCATION_EACH_ENTITIES.mlModel * cleanedUpNumOfRows;

    // データベース上の全ての学習モデルを古い順に検索
    // (新しいものは、未保存のトピックで使われる可能性があるため、なるべく削除しない)
    const mlModels = await this.mlModelRepository.find({
      order: {
        id: 'ASC',
      },
    });

    // 削除すべき行数を取得
    const deleteNumOfRows = mlModels.length - cleanedUpNumOfRowsOfMlModel;

    // いずれかのトピックで使用されている学習モデルのIDを列挙
    const usingMlModelIds = [];
    const topics = await this.topicsRepository.find();
    for (const topic of topics) {
      for (const pattern of topic.filterPatterns) {
        if (!pattern.trainedModelId) continue;
        usingMlModelIds.push(pattern.trainedModelId);
      }
    }

    // 検索された学習モデルから、どのトピックでも使われていないもののみを抽出
    const deleteMlModels = mlModels.filter((mlModel: MlModel) => {
      if (usingMlModelIds.indexOf(mlModel.id) === -1) return true;
      return false;
    });

    // 学習モデルを削除
    // (削除すべき行数に達するまで、または、使われていない学習モデルを全て削除するまで)
    let i = 0;
    for (const item of deleteMlModels) {
      if (deleteNumOfRows <= i) break;
      Logger.debug(`Delete MlModel... (id = ${item.id})`, 'CleanerConsumer/execCleanupMlModel');
      await item.remove();
      i++;
    }
    Logger.log(`Deleted ${i} items from MlModel.`, 'CleanerConsumer/execCleanupMlModel');
  }

  /**
   * 分類済みツイートのクリーンアップ
   * @param maxDBRows データベース行数の上限
   * @param predictedClass 分類クラス
   */
  protected async execCleanupClassifiedTweets(maxDBRows: number, predictedClass: string) {
    // エンティティのクリーンアップ後の行数を取得
    const cleanedUpNumOfRows = maxDBRows * this.AUTO_CLEANUP_DELETE_RATE_FOR_DB_ROWS;
    let cleanedUpNumOfRowsOfClassifiedTweetAtClass = 0;
    if (predictedClass === 'accept') {
      cleanedUpNumOfRowsOfClassifiedTweetAtClass =
        this.DB_ROWS_RATE_ALLOCATION_EACH_ENTITIES.classifiedTweetAccept * cleanedUpNumOfRows;
    } else {
      cleanedUpNumOfRowsOfClassifiedTweetAtClass =
        this.DB_ROWS_RATE_ALLOCATION_EACH_ENTITIES.classifiedTweetReject * cleanedUpNumOfRows;
    }

    const numOfExpectedRemoveItems =
      (await this.classifiedTweetRepository.count({
        where: {
          predictedClass: predictedClass,
        },
      })) - cleanedUpNumOfRowsOfClassifiedTweetAtClass;

    if (numOfExpectedRemoveItems <= 0) {
      return;
    }

    Logger.debug(
      `Counting items for ${predictedClass}... numOfExpectedRemoveItems = ${numOfExpectedRemoveItems}, cleanedUpNumOfRowsOfClassifiedTweetAtClass = ${cleanedUpNumOfRowsOfClassifiedTweetAtClass}`,
      'CleanerConsumer/execCleanupClassifiedTweets',
    );

    const removeItems = await this.classifiedTweetRepository.find({
      where: {
        predictedClass: predictedClass,
      },
      order: {
        crawledAt: 'ASC',
      },
      take: numOfExpectedRemoveItems,
    });

    let i = 0;
    for (const item of removeItems) {
      Logger.debug(
        `Delete ClassifiedTweet (${predictedClass})... (id = ${item.id})`,
        'CleanerConsumer/execCleanupClassifiedTweets',
      );
      await item.remove();
      i++;
    }
    Logger.log(
      `Deleted ${i} items from ClassifiedTweet (${predictedClass}).`,
      'CleanerConsumer/execCleanupClassifiedTweets',
    );
  }
}
