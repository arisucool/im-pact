import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateTopicDto } from './dto/create-topic.dto';
import { Topic } from './entities/topic.entity';
import { Repository, MoreThan, MoreThanOrEqual } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { MlService } from './ml/ml.service';
import { TwitterCrawlerService } from './ml/twitter-crawler.service';
import { ExtractedTweet } from './ml/entities/extracted-tweet.entity';
import { CrawledTweet } from './ml/entities/crawled-tweet.entity';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
    @InjectRepository(ExtractedTweet)
    private extractedTweetRepository: Repository<ExtractedTweet>,
    private mlService: MlService,
    private twitterCrawlerService: TwitterCrawlerService,
  ) {}

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
   * 指定されたトピックにおけるツイートの収集
   * @param id トピックID
   * @return 分類されたツイートの配列
   */
  async crawl(id: number): Promise<ExtractedTweet[]> {
    // トピックの取得
    const topic: Topic = await this.topicsRepository.findOne(id, {
      relations: ['crawlSocialAccount'],
    });
    if (topic === undefined) {
      throw new BadRequestException('Invalid item');
    }

    // フィルタパターンの取得
    if (!topic.filterPatterns[topic.enabledFilterPatternIndex]) {
      throw new BadRequestException('Invalid filter pattern');
    }
    const filterPatern = JSON.parse(topic.filterPatterns[topic.enabledFilterPatternIndex]);
    const filterSettings = filterPatern.filters;

    // 学習モデルの取得
    const trainedModelId = filterPatern.trainedModelId;
    if (!trainedModelId) {
      throw new BadRequestException('trainedModel not registered');
    }

    // 未分類ツイートの取得 (併せて収集も実行)
    let unextractedTweets = await this.getUnextractedTweets(topic);

    // 未分類ツイートの分類
    const predictedTweets = await this.mlService.predictTweets(
      trainedModelId,
      unextractedTweets,
      filterSettings,
      topic.keywords,
    );

    // 分類されたツイートの反復
    const savedTweets = [];
    for (const tweet of predictedTweets) {
      // 当該ツイートの登録
      console.log(`[TopicService] crawl - Inserting extracted tweets... ${tweet.idStr}`);
      tweet.predictedClass = tweet.predictedSelect ? 'accept' : 'reject';
      tweet.filtersResult = tweet.filtersResult;
      tweet.topic = topic.id;
      try {
        savedTweets.push(await this.extractedTweetRepository.save(tweet));
      } catch (e) {
        console.warn(e);
      }
    }

    // 分類されたツイートを返す
    console.log(`[TopicService] crawl - Done`);
    return savedTweets;
  }

  /**
   * 指定されたトピックにおける未分類ツイートの取得・収集
   * @param topic トピック
   * @param numOfRequestTweets 要求するツイート件数
   * @return 未分類ツイートの配列
   */
  private async getUnextractedTweets(topic: Topic, numOfRequestTweets: number = 50): Promise<CrawledTweet[]> {
    // トピックのキーワードを反復
    for (const keyword of topic.keywords) {
      // 当該キーワードにてツイートを収集
      const NUM_OF_MAX_CRAWL_TWEETS_OF_EACH_KEYWORD = numOfRequestTweets * 3; // TODO: API のコール制限を考えつつ調整できるようにしたい
      await this.twitterCrawlerService.crawlTweets(
        topic.crawlSocialAccount.id,
        keyword,
        NUM_OF_MAX_CRAWL_TWEETS_OF_EACH_KEYWORD,
      );
    }

    // トピックのキーワードを再度反復
    let tweets = [];
    for (const keyword of topic.keywords) {
      // 当該キーワードにて最近収集されたツイートを検索
      const NUM_OF_MAX_FIND_TWEETS_OF_EACH_KEYWORD = numOfRequestTweets * 5;
      const RANGE_OF_HOURS_TO_FIND = 24; // 24時間前に収集したツイートまで

      let whereCrawledAt = new Date();
      whereCrawledAt.setHours(RANGE_OF_HOURS_TO_FIND * -1);

      const tweetsOfThisKeyword = await this.crawledTweetRepository.find({
        where: {
          crawlKeyword: keyword,
          crawledAt: MoreThanOrEqual(whereCrawledAt),
        },
        order: {
          crawledAt: 'ASC',
        },
        take: NUM_OF_MAX_FIND_TWEETS_OF_EACH_KEYWORD,
      });
      tweets = tweets.concat(tweetsOfThisKeyword);
    }

    // 最近収集されたツイートから分類済みのものを除く
    await Promise.all(
      tweets.map(
        async tweet =>
          (
            await this.extractedTweetRepository.find({
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

    // 指定件数まで減らす
    if (numOfRequestTweets < tweets.length) {
      tweets = tweets.slice(0, numOfRequestTweets);
    }

    // 未分類のツイートを返す
    return tweets;
  }
}
