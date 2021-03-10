import { Process, Processor } from '@nestjs/bull';
import { Logger, BadRequestException } from '@nestjs/common';
import { Job } from 'bull';
import { TwitterCrawlerService } from '../ml/twitter-crawler.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawledTweet } from '../ml/entities/crawled-tweet.entity';
import { Topic } from '../entities/topic.entity';
import { CrawlExampleTweetsDto } from '../ml/dto/crawl-example-tweets.dto';
import { SearchCondition } from '../entities/search-condition.interface';

/**
 * ツイートの収集に関するキューを処理するためのコンシューマ
 */
@Processor('crawler')
export class CrawlerConsumer {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    private twitterCrawlerService: TwitterCrawlerService,
  ) {}

  /**
   * ツイートの収集を実行するためのジョブの処理
   * (@nestjs/bull から 'crawler' キューを介して呼び出される)
   * @param job ジョブ
   */
  @Process()
  async execJob(job: Job<any>): Promise<CrawledTweet[]> {
    Logger.debug(`Job starting... (ID: ${job.id})`, 'CrawlerConsumer/execJob');
    try {
      let tweets: CrawledTweet[] = [];

      // ジョブのパラメータを確認
      if (job.data.topicId) {
        // 当該トピックのツイートを収集
        const topicId = job.data.topicId;
        tweets = await this.crawlTweetsByTopicId(topicId, job);
      } else if ((job.data.dto as CrawlExampleTweetsDto) && job.data.dto.searchCondition) {
        // お手本分類および学習用サンプルとしてツイートを収集
        tweets = await this.crawlTweetsByGetExampleTweetsDto(job.data.dto as CrawlExampleTweetsDto, job);
      } else {
        throw new Error('Invalid job parameter');
      }

      // 完了
      Logger.debug(`Job completed... (ID: ${job.id})`, 'CrawlerConsumer/execJob');
      return tweets;
    } catch (e) {
      Logger.error(`Error has occurred in job... (ID: ${job.id})`, e.stack, 'CrawlerConsumer/execJob');
      throw e;
    }
  }

  /**
   * 指定されたトピックのためのツイートの収集
   * @param id トピックID
   * @param job ジョブ
   * @return 収集されたツイートの配列
   */
  async crawlTweetsByTopicId(id: number, job?: Job<any>): Promise<CrawledTweet[]> {
    // トピックを取得
    const topic: Topic = await this.topicsRepository.findOne(id, {
      relations: ['crawlSocialAccount'],
    });
    if (topic === undefined) {
      throw new BadRequestException('Invalid item');
    }

    // ジョブのステータスを更新
    job?.progress(10);

    // 収集を実行
    const numOfKeywords = topic.searchCondition.keywords.length;
    const numOfMinTweets = 150 * numOfKeywords;
    const crawledTweets = await this.crawlTweets(topic.crawlSocialAccount.id, topic.searchCondition, numOfMinTweets);

    // ジョブのステータスを更新
    job?.progress(100);

    // 完了
    Logger.log(`Crawled ${crawledTweets.length} tweets`, 'CrawlerConsumer/crawlTweets');
    return crawledTweets;
  }

  /**
   * 指定された条件におけるツイートの収集
   * (トピックが未保存の状態でも収集が行える。学習用サンプルを収集するために使用する。)
   * @param dto 学習用サンプルツイートを収集するための情報
   * @param job ジョブ
   * @return 収集されたツイートの配列
   */
  async crawlTweetsByGetExampleTweetsDto(dto: CrawlExampleTweetsDto, job: Job<any>): Promise<CrawledTweet[]> {
    const NUM_OF_REQUIRED_TWEETS = 1000;

    // 収集を実行
    const crawledTweets = await this.crawlTweets(dto.crawlSocialAccountId, dto.searchCondition, NUM_OF_REQUIRED_TWEETS);

    // ジョブのステータスを更新
    job?.progress(100);

    // 完了
    Logger.log(`Crawled ${crawledTweets.length} tweets for example tweets`, 'CrawlerConsumer/crawlExampleTweets');
    return crawledTweets;
  }

  /**
   * 指定されたパラメータによるツイートの収集
   * (収集されたツイートは、検索条件のキーワードなどに基づいて保存される。従って、トピックに関係なく使用できる。)
   * @param socialAccountId 収集に使用するソーシャルアカウントのID
   * @param searchCondition 検索条件
   * @param numOfMinTweets  最低ツイート数 (このツイート数が満たされるまでループする)
   * @return 保存されたツイートの配列
   */
  protected async crawlTweets(
    crawlSocialAccountId: number,
    searchCondition: SearchCondition,
    numOfMinTweets: number,
  ): Promise<CrawledTweet[]> {
    return await this.twitterCrawlerService.crawlTweets(crawlSocialAccountId, searchCondition, numOfMinTweets);
  }
}
