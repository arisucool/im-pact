import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as cronParser from 'cron-parser';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Topic } from './entities/topic.entity';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ExtractedTweet } from './ml/entities/extracted-tweet.entity';
import { TrainAndValidateDto } from './ml/dto/train-and-validate.dto';
import { CrawledTweet } from './ml/entities/crawled-tweet.entity';
import { ReTrainDto } from './ml/dto/retrain.dto';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
    @InjectRepository(ExtractedTweet)
    private extractedTweetRepository: Repository<ExtractedTweet>,
    @InjectQueue('crawler')
    private readonly crawlQueue: Queue,
    @InjectQueue('trainer')
    private readonly trainerQueue: Queue,
    @InjectQueue('action')
    private readonly actionQueue: Queue,
  ) {}

  /**
   * 毎分毎の定期処理
   */
  @Cron('* * * * *')
  async onIntervalMinutes() {
    // このタイミングで収集を実行すべきトピックIDを取得
    const crawlTopicIds = await this.getTopicIdsToBeCrawledOnNow();
    if (crawlTopicIds.length === 0) return;

    // 各トピックの収集ジョブをキューへ追加
    for (const topicId of crawlTopicIds) {
      const job = await this.crawlQueue.add({
        topicId: topicId,
      });
      Logger.debug(
        `Add job to crawler queue... (Topic ID: ${topicId}, Job ID: ${job.id})`,
        'TopicsService/onIntervalMinutes',
      );
    }
  }

  /**
   * 15分毎の定期処理
   */
  @Cron('*/15 * * * *') // TODO:
  async onIntervalTenMinutes() {
    // 全てのトピックIDを取得
    const topicIds = await this.getTopicIds();

    // 各トピックのアクション実行ジョブをキューへ追加
    for (const topicId of topicIds) {
      const job = await this.actionQueue.add({
        topicId: topicId,
      });
      Logger.debug(
        `Add job to action queue... (Topic ID: ${topicId}, Job ID: ${job.id})`,
        'TopicsService/onIntervalTenMinutes',
      );
    }
  }

  /**
   * 全てのトピックIDの取得
   */
  protected async getTopicIds(): Promise<number[]> {
    // トピックIDを代入する配列を初期化
    const topicIds: number[] = [];

    // トピックを反復
    const topics = await this.topicsRepository.find({
      select: ['id'],
    });
    for (const topic of topics) {
      topicIds.push(topic.id);
    }

    // トピックIDの配列を返す
    return topicIds;
  }

  /**
   * 現在のタイミングで収集を実行すべきトピックIDの取得
   * (各トピックの収集スケジュール設定から算出)
   * TODO: もっと負荷のかからなさそうなコードにしたい
   * @return トピックIDの配列
   */
  protected async getTopicIdsToBeCrawledOnNow(): Promise<number[]> {
    // 収集を実行すべきトピックのIDを代入する配列を初期化
    const topicIds: number[] = [];

    // 現在時刻を取得
    const now = new Date().getTime();

    // トピックを反復
    const topics = await this.topicsRepository.find({
      select: ['id', 'crawlSchedule'],
    });
    for (const topic of topics) {
      // 当該トピックの収集スケジュール (複数行) を配列へ
      const schedules = topic.crawlSchedule.split(/\n/);
      // 収集スケジュールを反復
      for (const schedule of schedules) {
        if (schedule.length === 0 || schedule.match(/\^s+$/)) {
          // 行が空ならば、スキップ
          continue;
        }

        // スケジュールをパース
        try {
          const parsedSchedule = cronParser.parseExpression(schedule);
          const nextDate = parsedSchedule.prev();
          if (59000 <= Math.abs(now - nextDate.getTime())) {
            // 現在時刻から59秒以上違えば、スキップ
            continue;
          }
        } catch (e) {
          Logger.error(
            `Could not parse the crawl schedule of the topic (Topic ID : ${topic.id})`,
            e,
            'TopicService/getTopicIdsToBeCrawledOnNow',
          );
          continue;
        }

        // トピックID を配列へ追加
        topicIds.push(topic.id);

        // 次のトピックへ
        break;
      }
    }

    return topicIds;
  }

  /**
   * トピックの作成
   * @param dto トピックを作成するための情報
   */
  async create(dto: CreateTopicDto): Promise<Topic> {
    const topic = new Topic();
    topic.name = dto.name;
    topic.keywords = dto.keywords;
    topic.crawlSocialAccount = new SocialAccount();
    topic.crawlSocialAccount.id = dto.crawlSocialAccountId;
    topic.crawlSchedule = dto.crawlSchedule;
    topic.filterPatterns = dto.filterPatterns;
    topic.enabledFilterPatternIndex = dto.enabledFilterPatternIndex;
    topic.actions = dto.actions;
    topic.trainingTweets = dto.trainingTweets;
    return await this.topicsRepository.save(topic);
  }

  /**
   * 全てのトピックの取得
   */
  async findAll() {
    return await this.topicsRepository.find();
  }

  /**
   * 指定されたトピックの取得
   * @param id トピックID
   */
  async findOne(id: number) {
    const item: Topic = await this.topicsRepository.findOne(id, {
      relations: ['crawlSocialAccount'],
      //loadRelationIds: true,
    });
    if (item === undefined) {
      throw new BadRequestException('Invalid item');
    }
    return item;
  }

  /**
   * 指定されたトピックIDの更新
   * @param id トピックID
   * @param dto
   */
  async update(id: number, dto: UpdateTopicDto) {
    const item: Topic = await this.topicsRepository.findOne(id);
    if (item === undefined) {
      throw new BadRequestException('Invalid item');
    }
    let updated = Object.assign(item, dto);
    return await this.topicsRepository.save(updated);
  }

  /**
   * 指定されたトピックの削除
   * @param id トピックID
   */
  async remove(id: number) {
    const item: Topic = await this.topicsRepository.findOne(id);
    if (item === undefined) {
      throw new BadRequestException('Invalid item');
    }
    item.remove();
  }

  /**
   * 指定されたトピックにおけるツイートの収集 (キューに対するジョブ追加)
   * @param id トピックID
   */
  async addJobToCrawlerQueue(id: number): Promise<string> {
    // crawler キューへジョブを追加
    // (crawler.consumer.ts にて順次処理される)
    const job = await this.crawlQueue.add({
      topicId: id,
    });

    // ジョブIDを返す
    return job.id.toString();
  }

  /**
   * 指定されたトピックにおけるアクションの実行 (キューに対するジョブ追加)
   * @param id トピックID
   */
  async addJobToActionQueue(id: number): Promise<string> {
    // action キューへジョブを追加
    // (action.consumer.ts にて順次処理される)
    const job = await this.actionQueue.add({
      topicId: id,
    });

    // ジョブIDを返す
    return job.id.toString();
  }

  /**
   * 指定されたトピックおよびツイートに対する承認
   * @param topicId トピックID
   * @param extractedTweetId 抽出済みツイートのID
   * @param token 承認用URLのトークン
   */
  async acceptTweet(topicId: number, extractedTweetId: number, token: string) {
    // URLトークンを確認
    if (!token.match(/^t(\d+)-(\d+)-(\d+)$/)) {
      throw new BadRequestException('Invalid url token');
    }

    // URLトークンからパラメータを取得
    const actionIndex = parseInt(RegExp.$1);
    const tweetIdStr = RegExp.$2;
    const tweetCrawledAt = RegExp.$3;

    // データベースからツイートを取得
    const tweet = await this.extractedTweetRepository.findOne(extractedTweetId, {
      loadRelationIds: true,
    });
    if (tweet == null) {
      throw new BadRequestException('Invalid tweet id');
    }

    const tweetTopicId = (tweet.topic as unknown) as number;

    // パラメータを照合
    if (
      tweet.lastActionIndex != actionIndex ||
      actionIndex <= tweet.completeActionIndex ||
      tweetTopicId != topicId ||
      tweet.idStr != tweetIdStr ||
      tweet.crawledAt.getTime().toString() != tweetCrawledAt
    ) {
      throw new BadRequestException('Invalid url token');
    }

    // ツイートの分類を承認へ (次のアクションへ遷移)
    tweet.predictedClass = 'accept';
    tweet.completeActionIndex += 1;
    await tweet.save();

    // ツイートを用いて再トレーニング
    const jobId = await this.retrainWithTweet(tweetTopicId, tweet);

    // レスポンスを返す
    return {
      retrainJobId: jobId,
      acceptedTweet: tweet,
    };
  }

  /**
   * 指定されたトピックおよびツイートに対する拒否
   * @param topicId トピックID
   * @param extractedTweetId 抽出済みツイートのID
   * @param token 拒否用URLのトークン
   */
  async rejectTweet(topicId: number, extractedTweetId: number, token: string) {
    // URLトークンを確認
    if (!token.match(/^t(\d+)-(\d+)-(\d+)$/)) {
      throw new BadRequestException('Invalid url token');
    }

    // URLトークンからパラメータを取得
    const actionIndex = parseInt(RegExp.$1);
    const tweetIdStr = RegExp.$2;
    const tweetCrawledAt = RegExp.$3;

    // データベースからツイートを取得
    const tweet = await this.extractedTweetRepository.findOne(extractedTweetId, {
      loadRelationIds: true,
    });
    if (tweet == null) {
      throw new BadRequestException('Invalid tweet id');
    }

    const tweetTopicId = (tweet.topic as unknown) as number;

    // パラメータを照合
    if (
      tweet.lastActionIndex != actionIndex ||
      actionIndex <= tweet.completeActionIndex ||
      tweetTopicId != topicId ||
      tweet.idStr != tweetIdStr ||
      tweet.crawledAt.getTime().toString() != tweetCrawledAt ||
      tweet.predictedClass == 'reject'
    ) {
      throw new BadRequestException('Invalid url token');
    }

    // ツイートの分類を拒否へ
    tweet.predictedClass = 'reject';
    await tweet.save();

    // ツイートを用いて再トレーニング
    const jobId = await this.retrainWithTweet(tweetTopicId, tweet);

    // レスポンスを返す
    return {
      retrainJobId: jobId,
      rejectedTweet: tweet,
    };
  }

  /**
   * 指定された抽出済みツイートによる再トレーニング (キューに対するジョブ追加)
   * (お手本分類、ツイートフィルタの学習、トレーニングおよび検証が再実行される)
   * @param topicId トピックID
   * @param tweet ツイート
   */
  async retrainWithTweet(topicId: number, tweet: ExtractedTweet) {
    // retrainer キューへジョブを追加
    // (trainer.consumer.ts にて順次処理される)
    const dto: ReTrainDto = {
      topicId: topicId,
      isSelected: tweet.predictedClass === 'accepted',
      tweet: tweet,
    };
    const job = await this.trainerQueue.add('retrainer', {
      dto: dto,
    });

    // ジョブIDを返す
    return job.id.toString();
  }
}
