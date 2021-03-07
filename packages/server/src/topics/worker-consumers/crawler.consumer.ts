import { Process, Processor } from '@nestjs/bull';
import { Logger, BadRequestException } from '@nestjs/common';
import { Job } from 'bull';
import { TwitterCrawlerService } from '../ml/twitter-crawler.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CrawledTweet } from '../ml/entities/crawled-tweet.entity';
import { ClassifiedTweet } from '../ml/entities/classified-tweet.entity';
import { Topic } from '../entities/topic.entity';

/**
 * 収集に関するキューを処理するためのコンシューマ
 */
@Processor('crawler')
export class CrawlerConsumer {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
    @InjectRepository(ClassifiedTweet)
    private classifiedTweetRepository: Repository<ClassifiedTweet>,
    private twitterCrawlerService: TwitterCrawlerService,
  ) {}

  /**
   * ツイートの収集を実行するためのジョブの処理
   * (@nestjs/bull から 'crawler' キューを介して呼び出される)
   * @param job ジョブ
   */
  @Process()
  async execJob(job: Job<any>) {
    Logger.debug(`Job starting... (ID: ${job.id})`, 'CrawlerConsumer/execJob');
    const topicId = job.data.topicId;
    try {
      const tweets = await this.crawl(topicId, job);
      Logger.debug(`Job completed... (ID: ${job.id})`, 'CrawlerConsumer/execJob');
      return tweets;
    } catch (e) {
      Logger.error(`Error has occurred in job... (ID: ${job.id})`, e.stack, 'CrawlerConsumer/execJob');
      throw e;
    }
  }

  /**
   * 指定されたトピックにおけるツイートの収集
   * @param id トピックID
   * @param job ジョブ
   * @return 収集されたツイートの配列
   */
  async crawl(id: number, job?: Job<any>): Promise<CrawledTweet[]> {
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
    const crawledTweets = await this.twitterCrawlerService.crawlTweets(
      topic.crawlSocialAccount.id,
      topic.searchCondition,
      numOfMinTweets,
    );

    // ジョブのステータスを更新
    job?.progress(100);

    // 完了
    Logger.log(`Crawled ${crawledTweets.length} tweets`, 'CrawlerConsumer/crawl');
    return crawledTweets;
  }
}
