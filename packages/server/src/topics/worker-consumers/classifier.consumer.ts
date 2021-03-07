import { Process, Processor } from '@nestjs/bull';
import { Logger, BadRequestException } from '@nestjs/common';
import { Job, DoneCallback } from 'bull';
import { MlService } from '../ml/ml.service';
import { TwitterCrawlerService } from '../ml/twitter-crawler.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CrawledTweet } from '../ml/entities/crawled-tweet.entity';
import { ClassifiedTweet } from '../ml/entities/classified-tweet.entity';
import { Topic } from '../entities/topic.entity';

/**
 * 分類 (ディープラーニング分類器) に関するキューを処理するためのコンシューマ
 */
@Processor('classifier')
export class ClassifierConsumer {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
    @InjectRepository(ClassifiedTweet)
    private classifiedTweetRepository: Repository<ClassifiedTweet>,
    private mlService: MlService,
    private twitterCrawlerService: TwitterCrawlerService,
  ) {}

  /**
   * 収集済みツイートの分類を実行するためのジョブの処理
   * (@nestjs/bull から 'classifier' キューを介して呼び出される)
   * @param job ジョブ
   */
  @Process()
  async execJob(job: Job<any>) {
    Logger.debug(`Job starting... (ID: ${job.id})`, 'ClassifierConsumer/execJob');
    const topicId = job.data.topicId;
    try {
      const tweets = await this.crawl(topicId, job);
      Logger.debug(`Job completed... (ID: ${job.id})`, 'ClassifierConsumer/execJob');
      return tweets;
    } catch (e) {
      Logger.error(`Error has occurred in job... (ID: ${job.id})`, e.stack, 'ClassifierConsumer/execJob');
      throw e;
    }
  }

  /**
   * 指定されたトピックにおけるツイートの収集
   * @param id トピックID
   * @param job ジョブ
   * @return 分類されたツイートの配列
   */
  async crawl(id: number, job?: Job<any>): Promise<ClassifiedTweet[]> {
    // トピックを取得
    const topic: Topic = await this.topicsRepository.findOne(id, {
      relations: ['crawlSocialAccount'],
    });
    if (topic === undefined) {
      throw new BadRequestException('Invalid item');
    }

    // フィルタパターンを取得
    if (!topic.filterPatterns[topic.enabledFilterPatternIndex]) {
      throw new BadRequestException('Invalid filter pattern');
    }
    const filterPatern = JSON.parse(topic.filterPatterns[topic.enabledFilterPatternIndex]);
    const filterSettings = filterPatern.filters;

    // 学習モデルを取得
    const trainedModelId = filterPatern.trainedModelId;
    if (!trainedModelId) {
      throw new BadRequestException('trainedModel not registered');
    }

    // ジョブのステータスを更新
    job?.progress(10);

    // 未分類ツイートを取得
    const unclassifiedTweets = await this.getUnclassifiedTweets(topic);

    // ジョブのステータスを更新
    job?.progress(20);

    // 未分類ツイートを分類
    const predictedTweets = await this.mlService.predictTweets(
      trainedModelId,
      unclassifiedTweets,
      filterSettings,
      topic.searchCondition.keywords,
    );

    // ジョブのステータスを更新
    job?.progress(75);

    // 分類されたツイートを反復
    const savedTweets = [],
      savedTweetIds = [];
    for (const tweet of predictedTweets) {
      // 当該ツイートを登録
      tweet.predictedClass = tweet.predictedSelect ? 'accept' : 'reject';
      Logger.debug(
        `Inserting classified tweets... ${tweet.idStr} (predictedClass = ${tweet.predictedClass})`,
        'ClassifierConsumer/classify',
      );
      tweet.filtersResult = tweet.filtersResult;
      tweet.topic = topic.id;
      try {
        savedTweets.push(await this.classifiedTweetRepository.save(tweet));
        savedTweetIds.push(tweet.idStr);
      } catch (e) {
        console.warn(e);
      }
    }

    // ジョブの収集済みツイート情報を更新
    if (job) job.update({ topicId: topic.id, tweetIds: savedTweetIds });

    // ジョブのステータスを更新
    job?.progress(100);

    // 分類されたツイートを返す
    return savedTweets;
  }

  /**
   * 指定されたトピックにおける未分類ツイートの取得
   * @param topic トピック
   * @param numOfRequestTweets 取得するツイート件数
   * @return 未分類ツイートの配列
   */
  private async getUnclassifiedTweets(topic: Topic, numOfRequestTweets = 50): Promise<CrawledTweet[]> {
    // トピックのキーワードを再度反復
    let tweets = [];
    for (const keyword of topic.searchCondition.keywords) {
      // 当該キーワードにて最近収集されたツイートを検索
      const RANGE_OF_HOURS_TO_FIND = 24; // 24時間前に収集したツイートまで

      const whereCrawledAt = new Date();
      whereCrawledAt.setHours(RANGE_OF_HOURS_TO_FIND * -1);

      const tweetsOfThisKeyword = await this.crawledTweetRepository.find({
        where: {
          crawlQuery: this.twitterCrawlerService.getQueryBySearchConditionAndKeyword(topic.searchCondition, keyword),
          crawlLanguage: topic.searchCondition.language,
          crawledAt: MoreThanOrEqual(whereCrawledAt),
        },
        order: {
          crawledAt: 'ASC',
        },
        //take: NUM_OF_MAX_FIND_TWEETS_OF_EACH_KEYWORD,
      });
      tweets = tweets.concat(tweetsOfThisKeyword);
    }

    Logger.debug(`Found ${tweets.length} tweets`, 'ClassifierConsumer/getUnclassifiedTweets');

    // 最近収集されたツイートから分類済みのものを除く
    await Promise.all(
      tweets.map(
        async tweet =>
          (
            await this.classifiedTweetRepository.find({
              where: {
                topic: topic.id,
                idStr: tweet.idStr,
              },
            })
          ).length,
      ),
    ).then(
      findResults =>
        (tweets = tweets.filter((tweet, index) => {
          if (0 < findResults[index]) return false;
          return true;
        })),
    );

    // 重複を除去
    tweets = tweets.filter((item, i, self) => {
      return (
        self.findIndex(item_ => {
          return item.idStr == item_.idStr;
        }) === i
      );
    });

    Logger.log(`Found ${tweets.length} unclassified tweets`, 'ClassifierConsumer/getUnclassifiedTweets');

    // 指定件数まで減らす
    if (numOfRequestTweets < tweets.length) {
      tweets = tweets.slice(0, numOfRequestTweets);
    }

    // 未分類のツイートを返す
    return tweets;
  }
}
