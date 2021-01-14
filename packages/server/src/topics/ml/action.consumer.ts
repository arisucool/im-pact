import { Process, Processor } from '@nestjs/bull';
import { Logger, BadRequestException } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, LessThan, IsNull, Not } from 'typeorm';
import { ActionManager } from './modules/action-manager';
import { Topic } from '../entities/topic.entity';
import { ModuleStorage } from './entities/module-storage.entity';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ExtractedTweet } from './entities/extracted-tweet.entity';

/**
 * アクションに関するキューを処理するためのコンシューマ
 */
@Processor('action')
export class ActionConsumer {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    @InjectRepository(ModuleStorage)
    private moduleStorageRepository: Repository<ModuleStorage>,
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
    @InjectRepository(ExtractedTweet)
    private extractedTweetRepository: Repository<ExtractedTweet>,
  ) {}

  /**
   * action ジョブの実行
   * (@nestjs/bull に呼び出される)
   * @param job ジョブ
   */
  @Process()
  async execJob(job: Job<any>) {
    Logger.debug(`Job starting... (ID: ${job.id})`, 'ActionConsumer/execJob');
    try {
      const actionResults = await this.execActions(job);
      Logger.debug(`Job completed... (ID: ${job.id})`, 'ActionConsumer/execJob');
      return actionResults;
    } catch (e) {
      Logger.error(`Error has occurred in job... (ID: ${job.id})`, e.stack, 'ActionConsumer/execJob');
      throw e;
    }
  }

  /**
   * 指定されたトピックの分類済みツイートに対するアクションの実行
   * @param job ジョブ
   * @return アクションの実行結果
   */
  async execActions(job?: Job<any>): Promise<any> {
    // トピックを取得
    const topicId = job.data.topicId;
    const topic: Topic = await this.topicsRepository.findOne(topicId, {
      relations: ['crawlSocialAccount'],
    });
    if (topic === undefined) {
      throw new BadRequestException('Invalid item');
    }

    // 対象ツイートを取得
    const tweets = await this.getActionUncompletedTweets(topic, 5); // TODO: ひとまず5件だけに絞る
    Logger.debug(
      `Found action uncompleted tweets for Topic ${topicId}... ${tweets.length} tweets`,
      'ActionConsumer/execActions',
    );

    // 各ツイートのアクションの実行結果を代入する連想配列を初期化
    const actionResults = {};

    // アクションマネージャを初期化
    let actionSettings = [];
    for (const actionSetting of topic.actions) {
      actionSettings.push(JSON.parse(actionSetting));
    }
    const actionManager = new ActionManager(
      this.moduleStorageRepository,
      this.socialAccountRepository,
      actionSettings,
      topic.keywords,
    );

    // 各ツイートを反復
    for (const tweet of tweets) {
      // 当該ツイートのアクションの完了済みインデックス番号を取得
      let completeActionIndex = tweet.completeActionIndex;

      // 実行結果の連想配列を更新
      actionResults[tweet.idStr] = completeActionIndex;

      // 当該ツイートのアクションを全て実行するために反復
      while (true) {
        // デバッグログを出力
        Logger.debug(
          `Trying to execute the action (index = ${completeActionIndex + 1}) for tweet...${tweet.idStr}`,
          'ActionConsumer/execActions',
        );

        // アクションを実行
        let completeStatus = null;
        try {
          completeStatus = await actionManager.execActionToTweet(tweet, topic);
        } catch (e) {
          // エラーならば
          Logger.error(`Could not action executed for tweet...${tweet.idStr}`, e.stack, 'ActionConsumer/execActions');
          // 実行結果の連想配列を更新
          actionResults[tweet.idStr] = completeActionIndex;
          // データベースを更新
          tweet.lastActionError = e.stack;
          tweet.lastActionExecutedAt = new Date();
          tweet.lastActionIndex = completeActionIndex + 1;
          tweet.save();
          // 次のツイートへ
          break;
        }

        // 実行結果を確認
        if (completeStatus === null) {
          // 実行すべきアクションが残っていなかったならば、次のツイートへ
          Logger.debug(
            `There are no remaining actions for tweet...${tweet.idStr} (lastActionIndex = ${tweet.lastActionIndex}, completeActionIndex = ${completeActionIndex})`,
            'ActionConsumer/execActions',
          );
          break;
        }

        // データベースを更新
        tweet.lastActionError = null;
        tweet.lastActionExecutedAt = new Date();
        tweet.lastActionIndex = completeActionIndex + 1;
        tweet.save();

        // 実行結果を確認
        if (!completeStatus) {
          // 保留 (承認系アクションなどで未承認の場合など) ならば、次のツイートへ
          Logger.debug(
            `Action for tweet was successful, but not completed...${tweet.idStr} (lastActionIndex = ${tweet.lastActionIndex}, completeActionIndex = ${completeActionIndex})`,
            'ActionConsumer/execActions',
          );
          break;
        }

        // アクションのインデックス番号を更新
        completeActionIndex++;
        tweet.completeActionIndex = completeActionIndex;
        Logger.debug(
          `Action was completed for tweet...${tweet.idStr} (lastActionIndex = ${tweet.lastActionIndex}, completeActionIndex = ${completeActionIndex})`,
          'ActionConsumer/execActions',
        );

        // 実行結果の連想配列を更新
        actionResults[tweet.idStr] = completeActionIndex;
      }
    }

    // アクションの実行結果を返す
    return actionResults;
  }

  /**
   * 指定されたトピックにおけるアクション未実行ツイートの取得
   * @param topic トピック
   * @param numOfTweets 要求するツイート件数
   * @return 分類済みツイートの配列
   */
  private async getActionUncompletedTweets(topic: Topic, numOfTweets: number = 50): Promise<ExtractedTweet[]> {
    // トピックのアクション数を取得
    const numOfActions = topic.actions.length;

    // データベースからツイートを取得 (アクション未実行のツイート)
    let tweets = await this.extractedTweetRepository.find({
      where: {
        topic: topic,
        completeActionIndex: LessThan(numOfActions - 1),
        predictedClass: 'accept',
        lastActionExecutedAt: IsNull(),
      },
      order: {
        extractedAt: 'ASC',
      },
      take: numOfTweets,
    });

    // データベースからツイートを取得 (一つでもアクション実行済のツイート)
    tweets = tweets.concat(
      await this.extractedTweetRepository.find({
        where: {
          topic: topic,
          completeActionIndex: LessThan(numOfActions - 1),
          predictedClass: 'accept',
          lastActionExecutedAt: Not(IsNull()),
        },
        order: {
          lastActionExecutedAt: 'ASC',
        },
        take: numOfTweets,
      }),
    );

    // 重複を除去
    tweets = tweets.filter((item, i, self) => {
      return (
        self.findIndex(item_ => {
          return item.idStr == item_.idStr;
        }) === i
      );
    });

    // 指定件数まで減らす
    if (numOfTweets < tweets.length) {
      tweets = tweets.slice(0, numOfTweets);
    }

    // ツイートを返す
    return tweets;
  }
}
