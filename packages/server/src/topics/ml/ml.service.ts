import { Injectable } from '@nestjs/common';
import { GetExampleTweetsDto } from './dto/get-example-tweets.dto';
import { createDeflateRaw } from 'zlib';
import * as Twitter from 'twitter';
import { SocialAccount } from '../../social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TrainAndValidateDto } from './dto/train-and-validate.dto';
import { CrawledTweet } from './entities/crawled-tweet.entity';
import { TweetFilterManager } from './tweet-filters';

@Injectable()
export class MlService {
  constructor(
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
  ) {}

  /**
   * 利用可能なツイートフィルタの取得
   */
  async getAvailableTweetFilters() {
    const manager = new TweetFilterManager();
    const filterNames = await manager.getAvailableModuleNames();

    let filters = {};
    for (const filterName of filterNames) {
      let mod = null;
      try {
        mod = manager.getModule(filterName, {});
      } catch (e) {
        console.warn(`[MlService] getAvailableTweetFilters - Error = `, e);
        continue;
      }

      if (mod === null) {
        console.warn(`[MlService] getAvailableTweetFilters - This module is null... `, filterName);
        continue;
      }

      filters[filterName] = {
        version: '1.0.0', // TODO
        description: mod.getDescription(),
        scope: mod.getScope(),
        settings: mod.getSettingsDefinition(),
      };
    }

    return filters;
  }

  /**
   * トレーニングおよび検証
   * (お手本分類の結果と、ツイートフィルタ設定をもとにデータセットを生成し、分類器のモデルを生成し、検証を行う)
   * @return トレーニングおよび検証の結果
   */
  async trainAndValidate(dto: TrainAndValidateDto) {
    // データセットを生成
    let [trainingDataset, validationDataset] = await this.getTrainingDataset(dto.trainingTweets, dto.filters);

    // 学習モデルの生成
    const generated_model = await this.trainModel(trainingDataset, validationDataset);

    // 結果を返す
    return {
      trainingResult: {},
      validationResult: {},
    };
  }

  /**
   * 学習のためのデータセットの生成
   * @param trainingTweets お手本分類の結果
   * @param filterSettings ツイートフィルタ設定
   * @return 学習用データセットおよび検証用データセット
   */
  protected async getTrainingDataset(trainingTweets: any[], filterSettings: any[]) {
    // 各ツイートに対して、ツイートフィルタを実行し、分類のための変数を取得
    const datasets = [];
    let tweetFiltersResult = {};
    for (let tweet of trainingTweets) {
      // TODO
      datasets.push();
    }
    let trainingDataset = [];
    let validationDataset = [];
    return [trainingDataset, validationDataset];
  }

  /**
   * 学習モデルの生成
   * @param trainingDataset 学習用データセット
   * @param validationDataset 検証用データセット
   * @return 生成されたモデル
   */
  protected async trainModel(trainingDataset: any, validationDataset: any) {}

  /**
   * 学習用サンプルツイートの取得
   * (未収集ならば、収集もあわせて行う)
   * @param dto 学習用サンプルツイートを収集するための情報
   * @return 検索結果のツイート配列
   */
  async getExampleTweets(dto: GetExampleTweetsDto) {
    // 収集されたツイートを検索
    let crawledTweets = await this.crawledTweetRepository.find({
      crawlKeyword: dto.keyword,
    });
    if (100 <= crawledTweets.length) {
      // 100件以上あれば
      return crawledTweets;
    }

    // 新たにツイートを収集
    await this.crawlExampleTweets(dto);

    // 収集されたツイートを再検索
    crawledTweets = await this.crawledTweetRepository.find({
      crawlKeyword: dto.keyword,
    });
    return crawledTweets;
  }

  /**
   * 学習用サンプルツイートの収集
   * @param dto 学習用サンプルツイートを収集するための情報
   */
  protected async crawlExampleTweets(dto: GetExampleTweetsDto) {
    // Twitter上でツイートを検索
    const tweets = await this.searchTweetsByKeyword(dto.crawlSocialAccountId, dto.keyword);
    console.log(`[MlService] getExampleTweets - Found ${tweets.length} tweets`);

    // ツイートを反復
    for (const tweet of tweets) {
      // 当該ツイートを保存
      await this.saveTweet(dto.keyword, tweet, true);
    }
  }

  /**
   * ツイートの保存
   * @param keyword 検索時のキーワード
   * @param tweet  ツイート
   * @param should_integrate_rt リツイート (引用リツイートを除く) を元ツイートへ統合するか
   */
  protected async saveTweet(keyword: string, tweet: any, should_integrate_rt: boolean) {
    // 当該ツイートがデータベースに存在しないか確認
    const exists_tweet =
      0 <
      (
        await this.crawledTweetRepository.find({
          idStr: tweet.id_str,
        })
      ).length;
    if (exists_tweet) {
      // 既に存在するならば、スキップ
      return;
    }

    // ツイートのオブジェクトを初期化
    const crawledTweet = new CrawledTweet();

    // ツイートの情報を付加
    crawledTweet.idStr = tweet.id_str;
    crawledTweet.createdAt = tweet.created_at;
    crawledTweet.crawlKeyword = keyword;
    crawledTweet.rawJSONData = JSON.stringify(tweet);
    crawledTweet.socialAccount = null; // TODO
    crawledTweet.text = tweet.text;
    crawledTweet.url = `https://twitter.com/${tweet.user.id_str}/status/${tweet.id_str}`;
    crawledTweet.crawledRetweetIdStrs = [];

    // リツイート (引用リツイートを除く) のための処理
    if (tweet.retweeted_status) {
      if (should_integrate_rt) {
        // リツイートの統合が有効ならば、元ツイートのリツイート数を増加
        // (当該ツイート自体は残さず、元ツイートのみを残す)
        this.incrementRetweetCountOfOriginalTweet(keyword, tweet.id_str, tweet.retweeted_status);
        // 完了
        return;
      } else {
        // 元ツイートの情報を付加
        crawledTweet.originalIdStr = tweet.retweeted_status.id_str;
        crawledTweet.originalCreatedAt = tweet.retweeted_status.created_at;
        crawledTweet.originalUserIdStr = tweet.retweeted_status.user.id_str;
        crawledTweet.originalUserName = tweet.retweeted_status.user.name;
        crawledTweet.originalUserScreenName = tweet.retweeted_status.user.screen_name;
      }
    }

    // 引用リツイートのための処理
    if (tweet.quoted_status) {
      // 元ツイートのリツイート数を増加
      this.incrementRetweetCountOfOriginalTweet(keyword, tweet.id_str, tweet.quoted_status);
      // 元ツイートの情報を付加
      crawledTweet.originalIdStr = tweet.quoted_status.id_str;
      crawledTweet.originalCreatedAt = tweet.quoted_status.created_at;
      crawledTweet.originalUserIdStr = tweet.quoted_status.user.id_str;
      crawledTweet.originalUserName = tweet.quoted_status.user.name;
      crawledTweet.originalUserScreenName = tweet.quoted_status.user.screen_name;
    }

    // ツイート投稿者の情報
    crawledTweet.userIdStr = tweet.user.id_str;
    crawledTweet.userName = tweet.user.name;
    crawledTweet.userScreenName = tweet.user.screen_name;

    // 追加
    console.log(`[MlService] getExampleTweets - Inserting tweet... ${crawledTweet.idStr}`);
    await this.crawledTweetRepository.insert(crawledTweet);
  }

  /**
   * 指定された元ツイートに対するリツイート数の増加
   * @param keyword 検索時のキーワード
   * @param retweetIdStr リツイートのID文字列
   * @param originalTweet 元ツイートのオブジェクト
   * @return 元ツイートのリツイート数
   */
  protected async incrementRetweetCountOfOriginalTweet(
    keyword: string,
    retweetIdStr: string,
    originalTweet: any,
  ): Promise<number> {
    // 元ツイートを検索
    let original_tweets = await this.crawledTweetRepository.find({
      idStr: originalTweet.id_str,
    });

    if (original_tweets.length <= 0) {
      // 元ツイートが存在しなければ、元ツイートを保存
      console.log(`[MlService] saveTweet - Saving original tweet... (ID: ${originalTweet.id_str})`);
      await this.saveTweet(keyword, originalTweet, true);

      // 元ツイートを再検索
      original_tweets = await this.crawledTweetRepository.find({
        idStr: originalTweet.id_str,
      });
    }

    // 元ツイートにリツイートのID文字列を残す
    if (!original_tweets[0].crawledRetweetIdStrs) {
      original_tweets[0].crawledRetweetIdStrs = [];
    } else if (original_tweets[0].crawledRetweetIdStrs.indexOf(retweetIdStr) !== -1) {
      // 既にこのリツイートが含まれているならば、何もしない
      return;
    }
    original_tweets[0].crawledRetweetIdStrs.push(retweetIdStr);

    // 元ツイートのリツイート数を算出
    original_tweets[0].crawledRetweetCount = original_tweets[0].crawledRetweetIdStrs.length;
    console.log(
      `[MlService] saveTweet - Increment retweetCount... ${original_tweets[0].crawledRetweetCount} (ID: ${original_tweets[0].idStr})`,
    );

    // 元ツイートを保存
    await original_tweets[0].save();

    // 元ツイートのリツイート数を返す
    return original_tweets[0].crawledRetweetCount;
  }

  /**
   * 指定されたキーワードによる Twitter API 上でのツイートの検索
   * @param socialAccountId 検索に使用するソーシャルアカウントのID
   * @param keyword キーワード
   * @return 検索結果のツイート配列
   */
  protected async searchTweetsByKeyword(socialAccountId: number, keyword: string): Promise<any[]> {
    // クエリを整形
    let query = keyword;
    if (query.indexOf('"') === -1) {
      // キーワードにダブルクオートが含まれないならば
      // キーワードをダブルクオートで囲む
      query = `"${query}"`;
    }

    // 検索条件を設定
    const searchCondition = {
      q: query,
      lang: 'ja',
      result_type: 'recent',
      count: 100,
    };

    // 検索を実行
    return await this.searchTweets(socialAccountId, searchCondition);
  }

  /**
   * Twitter API 上でのツイートの検索
   * @param socialAccountId 検索に使用するソーシャルアカウントのID
   * @param searchCondition 検索条件
   * @return 検索結果のツイート配列
   */
  protected async searchTweets(socialAccountId: number, searchCondition: any): Promise<any[]> {
    // 収集に使用するソーシャルアカウントを取得
    const socialAccount = await this.socialAccountRepository.findOne(socialAccountId);
    if (!socialAccount) {
      throw new Error('Invalid social account');
    }

    // Twitter クライアントを初期化
    if (!process.env.TWITTER_CONSUMER_KEY)
      throw new Error('TWITTER_CONSUMER_KEY is not specfied in the environment variable.');
    if (!process.env.TWITTER_CONSUMER_SECRET)
      throw new Error('TWITTER_CONSUMER_SECRET is not specfied in the environment variable.');
    const twitterClient = new Twitter({
      access_token_key: socialAccount.accessToken,
      access_token_secret: socialAccount.accessTokenSecret,
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    });

    return new Promise((resolve, reject) => {
      // ツイートを検索
      twitterClient.get('search/tweets', searchCondition, (error, tweets, response) => {
        if (error) {
          return reject(error);
        }

        resolve(tweets.statuses);
      });
    });
  }
}
