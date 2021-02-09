import { Process, Processor } from '@nestjs/bull';
import { Logger, BadRequestException } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, LessThan, IsNull, Not, Equal } from 'typeorm';
import { ActionManager } from '../ml/modules/action-manager';
import { Topic } from '../entities/topic.entity';
import { ModuleStorage } from '../ml/entities/module-storage.entity';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ExtractedTweet } from '../ml/entities/extracted-tweet.entity';
import { Action, ActionBulk } from '../ml/modules/actions/interfaces/action.interface';

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
   * アクションを実行するためのジョブの処理
   * (@nestjs/bull から 'action' キューを介して呼び出される)
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

    // 一括アクションを実行
    await this.execBulkActions(topic);

    // 単体アクションを実行
    await this.execSingleActions(topic);
  }

  /**
   * 指定されたトピックにおける単体アクションの実行
   * @param topic トピック
   */
  protected async execSingleActions(topic: Topic): Promise<any> {
    // 対象ツイートを取得
    const tweets = await this.getActionUncompletedTweets(topic, 5); // TODO: ひとまず5件だけに絞る
    Logger.debug(
      `Found action uncompleted tweets for Topic ${topic.id}... ${tweets.length} tweets`,
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
      this.extractedTweetRepository,
      this.socialAccountRepository,
      actionSettings,
      topic.searchCondition.keywords,
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
        Logger.log(
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
   * 指定されたトピックにおける一括アクションの実行
   * @param topic トピック
   */
  protected async execBulkActions(topic: Topic): Promise<any> {
    // アクションマネージャを初期化
    let actionSettings = [];
    for (const actionSetting of topic.actions) {
      actionSettings.push(JSON.parse(actionSetting));
    }
    const actionManager = new ActionManager(
      this.moduleStorageRepository,
      this.extractedTweetRepository,
      this.socialAccountRepository,
      actionSettings,
      topic.searchCondition.keywords,
    );

    // アクション実行結果を代入する連想配列 (キーは収集済みツイートのID) を初期化
    let allActionResults = {};

    // アクションを反復
    for (let actionIndex = 0, l = actionSettings.length; actionIndex < l; actionIndex++) {
      const action = actionSettings[actionIndex];

      // 当該アクションモジュールを取得
      let mod: any = null,
        moduleError = null;
      try {
        mod = await actionManager.getModule(action.name, actionIndex, topic);
      } catch (e) {
        // アクションモジュールの初期化に失敗したときは、モジュールエラーとして保持しておく
        moduleError = e;
      }
      if (mod && mod.execActionBulk == undefined) {
        // 当該アクションがアクション一括実行に非対応ならば、次のアクションへ
        continue;
      }

      // 当該アクションを実行すべきツイートを取得
      let tweets = await this.extractedTweetRepository.find({
        where: {
          topic: topic,
          completeActionIndex: Equal(actionIndex - 1),
          predictedClass: 'accept',
        },
        order: {
          extractedAt: 'ASC',
        },
      });
      Logger.debug(
        `Found action uncompleted tweets for action ${action.name} (actionIndex = ${actionIndex}) of Topic ${topic.id}... ${tweets.length} tweets`,
        'ActionConsumer/execBulkActions',
      );
      if (tweets.length <= 0) continue;

      // アクションを一括実行
      let results = {};
      if (!moduleError) {
        try {
          results = await mod.execActionBulk(tweets);
        } catch (e) {
          // 一括実行に致命的なエラーがあれば、モジュールエラーとして保持
          moduleError = e;
        }
      }

      // エラー処理
      if (moduleError) {
        // モジュールエラーがあれば、全ツイートともエラーとする
        for (const tweet of tweets) {
          results[tweet.id] = moduleError;
        }
      } else if (results === null || results === undefined) {
        // 実行結果が空ならば、全ツイートともエラーとする
        results = {};
        for (const tweet of tweets) {
          results[tweet.id] = new Error(`Action ${action.name} returns null or undefined`);
        }
      }

      // 一括実行された結果を反復
      for (let extractedTweetId of Object.keys(results)) {
        const result = results[extractedTweetId];

        // 実行結果を連想配列へ代入
        allActionResults[extractedTweetId] = result;

        // 当該ツイートを取得
        let extractedTweetIdNum = parseInt(extractedTweetId);
        if (isNaN(extractedTweetIdNum)) continue;
        const tweet = tweets.find((tweet: ExtractedTweet) => {
          return tweet.id === extractedTweetIdNum;
        });
        if (tweet == null) continue;

        // 実行結果を確認
        if (!(result instanceof Boolean) && result.stack && result.message) {
          // エラーならば、エラー情報をデータベースへ保存
          tweet.lastActionError = result.stack;
          tweet.lastActionExecutedAt = new Date();
          tweet.lastActionIndex = actionIndex;
          // エラーを出力
          Logger.error(
            `Error occurred at tweet ${tweet.id} of action ${action.name} (actionIndex= ${actionIndex})... `,
            result.stack,
            'ActionConsumer/execBulkActions',
          );
        } else if (!(typeof result == 'boolean') && !(result instanceof Boolean)) {
          // 戻り値が不正ならば、エラー情報をデータベースへ保存
          tweet.lastActionError = `Action ${action.name} returns invalid value`;
          tweet.lastActionExecutedAt = new Date();
          tweet.lastActionIndex = actionIndex;
          // エラーを出力
          Logger.error(
            `Error occurred at tweet ${tweet.id} of action ${action.name} (actionIndex= ${actionIndex})... `,
            `Action ${action.name} returns invalid value... ${result}`,
            'ActionConsumer/execBulkActions',
          );
        } else if (result === false) {
          // 成功だが、保留 (承認系アクションなどで未承認の場合など) ならば
          tweet.lastActionError = null;
          tweet.lastActionExecutedAt = new Date();
          tweet.lastActionIndex = actionIndex;
          // ログを出力
          Logger.debug(
            `Action for tweet was successful, but not completed...${tweet.idStr} (lastActionIndex = ${tweet.lastActionIndex}, completeActionIndex = ${tweet.completeActionIndex})`,
            'ActionConsumer/execBulkActions',
          );
        } else {
          // 成功かつ、次のアクションへ遷移して良いならば
          tweet.completeActionIndex = actionIndex;
          tweet.lastActionError = null;
          tweet.lastActionExecutedAt = new Date();
          tweet.lastActionIndex = actionIndex;
          // ログを出力
          Logger.log(
            `Action was completed for tweet...${tweet.idStr} (lastActionIndex = ${tweet.lastActionIndex}, completeActionIndex = ${tweet.completeActionIndex})`,
            'ActionConsumer/execBulkActions',
          );
        }

        // ツイートを上書き
        await tweet.save();
      }
    }

    return allActionResults;
  }

  /**
   * 指定されたトピックにおけるアクション未実行ツイートの取得
   * @param topic トピック
   * @param numOfTweets 要求するツイート件数
   * @return 分類済みツイートの配列
   */
  protected async getActionUncompletedTweets(topic: Topic, numOfTweets = 50): Promise<ExtractedTweet[]> {
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
