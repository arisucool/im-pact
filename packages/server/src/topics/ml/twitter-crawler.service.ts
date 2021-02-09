import { Injectable } from '@nestjs/common';
import { GetExampleTweetsDto } from './dto/get-example-tweets.dto';
import * as Twitter from 'twitter';
import { SocialAccount } from '../../social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CrawledTweet } from './entities/crawled-tweet.entity';
import { SearchCondition } from '../entities/search-condition.interface';

@Injectable()
export class TwitterCrawlerService {
  constructor(
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
  ) {}

  /**
   * ツイートの収集
   * @param socialAccountId 検索に使用するソーシャルアカウントのID
   * @param searchCondition 検索条件
   * @param numOfMinTweets  最低ツイート数 (このツイート数が満たされるまでループする)
   * @return 保存されたツイートの配列
   */
  async crawlTweets(
    socialAccountId: number,
    searchCondition: SearchCondition,
    numOfMinTweets: number,
  ): Promise<CrawledTweet[]> {
    // 検索キーワードを反復
    const savedTweets: CrawledTweet[] = [];
    const keywords = searchCondition.keywords;
    for (const keyword of keywords) {
      // Twitter上でツイートを検索
      const tweets = await this.searchTweetsByQuery(
        socialAccountId,
        this.getQueryBySearchConditionAndKeyword(searchCondition, keyword),
        searchCondition.language,
        Math.floor(numOfMinTweets / keywords.length),
      );
      console.log(`[MlService] crawlTweets - Found ${tweets.length} tweets... ${keyword}`);

      // ツイートを反復
      for (const tweet of tweets) {
        // 当該ツイートをデータベースへ保存
        const savedTweet = await this.saveTweet(
          this.getQueryBySearchConditionAndKeyword(searchCondition, keyword),
          tweet,
          true,
        );
        if (!savedTweet) continue;
        savedTweets.push(savedTweet);
      }
    }

    return savedTweets;
  }

  /**
   * 学習用サンプルツイートの取得
   * (未収集ならば、収集もあわせて行う)
   * @param dto 学習用サンプルツイートを収集するための情報
   * @return 検索結果のツイート配列
   */
  async getExampleTweets(dto: GetExampleTweetsDto): Promise<any[]> {
    const NUM_OF_REQUIRED_TWEETS = 1000;

    // 既に収集されたツイートを検索
    let crawledTweets = [];
    for (const keyword of dto.searchCondition.keywords) {
      const query = this.getQueryBySearchConditionAndKeyword(dto.searchCondition, keyword);
      const tweets = await this.crawledTweetRepository.find({
        crawlQuery: query,
        crawlLanguage: dto.searchCondition.language,
      });
      crawledTweets = crawledTweets.concat(tweets);
    }
    if (NUM_OF_REQUIRED_TWEETS <= crawledTweets.length) {
      // 既に指定件数以上あれば、そのまま返す
      return crawledTweets;
    }

    // 新たにツイートを収集
    await this.crawlTweets(dto.crawlSocialAccountId, dto.searchCondition, NUM_OF_REQUIRED_TWEETS);

    // 収集されたツイートを再検索
    crawledTweets = [];
    for (const keyword of dto.searchCondition.keywords) {
      const query = this.getQueryBySearchConditionAndKeyword(dto.searchCondition, keyword);
      crawledTweets = await this.crawledTweetRepository.find({
        crawlQuery: query,
        crawlLanguage: dto.searchCondition.language,
      });
    }
    return crawledTweets;
  }

  /**
   * ツイートの保存
   * @param query 検索時のキーワード
   * @param tweet  ツイート
   * @param should_integrate_rt リツイート (引用リツイートを除く) を元ツイートへ統合するか
   * @return 保存されたツイート
   */
  protected async saveTweet(query: string, tweet: any, should_integrate_rt: boolean): Promise<CrawledTweet> {
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
      return null;
    }

    // ツイートのオブジェクトを初期化
    const crawledTweet = new CrawledTweet();

    // ツイートの情報を付加
    crawledTweet.idStr = tweet.id_str;
    crawledTweet.createdAt = tweet.created_at;
    crawledTweet.crawlQuery = query;
    crawledTweet.rawJSONData = JSON.stringify(tweet);
    crawledTweet.socialAccount = null; // TODO
    crawledTweet.text = tweet.text;
    crawledTweet.url = `https://twitter.com/${tweet.user.id_str}/status/${tweet.id_str}`;
    crawledTweet.crawledRetweetIdStrs = [];

    // ツイートの画像を抽出
    crawledTweet.imageUrls = this.getImageUrlsByTweet(crawledTweet);

    // ツイートのハッシュタグを抽出
    crawledTweet.hashtags = this.getHashTagsByTweet(crawledTweet);

    // リツイート (引用リツイートを除く) のための処理
    if (tweet.retweeted_status) {
      if (should_integrate_rt) {
        // リツイートの統合が有効ならば、元ツイートのリツイート数を増加
        // (当該ツイート自体は残さず、元ツイートのみを残す)
        return await this.incrementRetweetCountOfOriginalTweet(query, tweet.id_str, tweet.retweeted_status);
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
      this.incrementRetweetCountOfOriginalTweet(query, tweet.id_str, tweet.quoted_status);
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
    console.log(`[MlService] saveTweet - Inserting tweet... ${crawledTweet.idStr}`);
    return await this.crawledTweetRepository.save(crawledTweet);
  }

  /**
   * 指定された元ツイートに対するリツイート数の増加
   * @param keyword 検索時のキーワード
   * @param retweetIdStr リツイートのID文字列
   * @param originalTweet 元ツイートのオブジェクト
   * @return 元ツイート
   */
  protected async incrementRetweetCountOfOriginalTweet(
    keyword: string,
    retweetIdStr: string,
    originalTweet: any,
  ): Promise<CrawledTweet> {
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
    //console.log(
    //  `[MlService] saveTweet - Increment retweetCount... ${original_tweets[0].crawledRetweetCount} (ID: ${original_tweets[0].idStr})`,
    //);

    // 元ツイートを保存
    await original_tweets[0].save();

    // 元ツイートを返す
    return original_tweets[0];
  }

  /**
   * 指定されたクエリによる Twitter API 上でのツイートの検索
   * @param socialAccountId 検索に使用するソーシャルアカウントのID
   * @param query 検索クエリ
   * @param lang  検索言語
   * @param minNumOfTweets 検索する最低ツイート数 (このツイートを満たせるまでループする)
   * @return 検索結果のツイート配列
   */
  protected async searchTweetsByQuery(
    socialAccountId: number,
    query: string,
    lang: string,
    minNumOfTweets: number,
  ): Promise<any[]> {
    // 検索パラメータを設定
    const searchParams = {
      q: query,
      lang: lang,
      result_type: 'recent',
      count: 100,
      max_id: null,
    };

    // 検索を実行
    let tweets = [];
    for (let i = 0; i < 5; i++) {
      let tweetsofPage = await this.searchTweets(socialAccountId, searchParams);
      tweets = tweets.concat(tweetsofPage);

      if (tweetsofPage.length == 0) {
        // ツイートがなければ、ループを終了
        break;
      } else if (minNumOfTweets <= tweets.length) {
        // 指定件数以上取得できたら、ループを終了
        break;
      }

      // 次ページを取得するために、最後のツイートのIDから1引いて、maxIdに指定
      searchParams.max_id = tweetsofPage[tweetsofPage.length - 1].id_str;
    }
    return tweets;
  }

  /**
   * Twitter API 上でのツイートの検索
   * @param socialAccountId 検索に使用するソーシャルアカウントのID
   * @param searchParams    検索パラメータ
   * @return 検索結果のツイート配列
   */
  protected async searchTweets(socialAccountId: number, searchParams: any): Promise<any[]> {
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
      twitterClient.get('search/tweets', searchParams, (error, tweets, response) => {
        if (error) {
          return reject(error);
        }

        resolve(tweets.statuses);
      });
    });
  }

  /**
   * 指定されたツイートからのハッシュタグの取得
   * @param tweet ツイート
   * @return ハッシュタグ配列
   */
  protected getHashTagsByTweet(tweet: CrawledTweet): string[] {
    // ツイートの生データを取得
    const tweetRawData = JSON.parse(tweet.rawJSONData);

    // ハッシュタグを抽出するための配列を初期化
    let hashtags = [];

    // ハッシュタグが存在するか判定
    if (!tweetRawData.entities || !tweetRawData.entities.hashtags) {
      return [];
    }

    // ハッシュタグを反復
    for (const hashtag of tweetRawData.entities.hashtags) {
      // 当該ハッシュタグを配列へ追加
      hashtags.push(hashtag.text);
    }

    // ハッシュタグの重複除去
    hashtags = hashtags.filter((x, i, self) => {
      return self.indexOf(x) === i;
    });

    // ハッシュタグの配列を返す
    return hashtags;
  }

  /**
   * 指定されたツイートからの画像URLの取得
   * @param tweet ツイート
   * @return 画像URLの配列
   */
  getImageUrlsByTweet(crawledTweet: CrawledTweet): string[] {
    // ツイートを取得
    const rawTweet = JSON.parse(crawledTweet.rawJSONData);

    // 画像URLを抽出するための配列を初期化
    let imageUrls = [];

    // ツイートにメディアが存在するか判定
    if (rawTweet.entities && rawTweet.entities.media) {
      // ツイートのメディアを反復
      for (const media of rawTweet.entities.media) {
        if (media.type !== 'photo') {
          // 画像でなければ
          // スキップ
          continue;
        }

        // 当該画像URLを配列へ追加
        imageUrls.push(media.media_url_https);
      }
    }

    // リツイートにメディアが存在するか判定
    if (rawTweet.retweeted_status && rawTweet.retweeted_status.entities && rawTweet.retweeted_status.entities.media) {
      // ツイートのメディアを反復
      for (const media of rawTweet.retweeted_status.entities.media) {
        if (media.type !== 'photo') {
          // 画像でなければ
          // スキップ
          continue;
        }

        // 当該画像URLを配列へ追加
        imageUrls.push(media.media_url_https);
      }
    }

    // 重複を除去
    imageUrls = imageUrls.filter((x, i, self) => {
      return self.indexOf(x) === i;
    });

    // 画像URLの配列を返す
    return imageUrls;
  }

  /**
   * 指定された検索条件およびキーワードによるクエリ文字列の取得
   * @param searchCondition 検索条件
   * @param keyword 検索条件に含まれたキーワードのうちの一つ
   * @return クエリ文字列
   */
  public getQueryBySearchConditionAndKeyword(searchCondition: SearchCondition, keyword: string): string {
    // クエリを生成
    let query = `"${keyword}"`;
    if (searchCondition.images) {
      query += ' filter:images';
    }
    return query;
  }
}
