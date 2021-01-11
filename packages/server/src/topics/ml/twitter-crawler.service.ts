import { Injectable } from '@nestjs/common';
import { GetExampleTweetsDto } from './dto/get-example-tweets.dto';
import * as Twitter from 'twitter';
import { SocialAccount } from '../../social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CrawledTweet } from './entities/crawled-tweet.entity';

@Injectable()
export class TwitterCrawlerService {
  constructor(
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
  ) {}

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
    await this.crawlExampleTweets(dto.crawlSocialAccountId, dto.keyword);

    // 収集されたツイートを再検索
    crawledTweets = await this.crawledTweetRepository.find({
      crawlKeyword: dto.keyword,
    });
    return crawledTweets;
  }

  /**
   * 学習用サンプルツイートの収集
   * @param socialAccountId 検索に使用するソーシャルアカウントのID
   * @param keyword キーワード
   */
  protected async crawlExampleTweets(socialAccountId: number, keyword: string) {
    // Twitter上でツイートを検索
    // (RTはまとめられるのでこの数より少なくなる)
    const MIN_NUM_OF_TWEETS = 300;
    const tweets = await this.searchTweetsByKeyword(socialAccountId, keyword, MIN_NUM_OF_TWEETS);
    console.log(`[MlService] getExampleTweets - Found ${tweets.length} tweets... ${keyword}`);

    // ツイートを反復
    for (const tweet of tweets) {
      // 当該ツイートをデータベースへ保存
      await this.saveTweet(keyword, tweet, true);
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

    // ツイートのハッシュタグを付加
    crawledTweet.hashtags = this.getHashTagsByTweet(crawledTweet);

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
    //console.log(
    //  `[MlService] saveTweet - Increment retweetCount... ${original_tweets[0].crawledRetweetCount} (ID: ${original_tweets[0].idStr})`,
    //);

    // 元ツイートを保存
    await original_tweets[0].save();

    // 元ツイートのリツイート数を返す
    return original_tweets[0].crawledRetweetCount;
  }

  /**
   * 指定されたキーワードによる Twitter API 上でのツイートの検索
   * @param socialAccountId 検索に使用するソーシャルアカウントのID
   * @param keyword キーワード
   * @param minNumOfTweets 検索する最低ツイート数 (このツイートを満たせるまでループする)
   * @return 検索結果のツイート配列
   */
  protected async searchTweetsByKeyword(
    socialAccountId: number,
    keyword: string,
    minNumOfTweets: number,
  ): Promise<any[]> {
    // クエリを整形
    let query = keyword;
    if (query.indexOf('"') === -1) {
      // キーワードにダブルクオートが含まれないならば
      // キーワードをダブルクオートで囲む
      query = `"${query}"`;
    }

    // 検索条件を設定
    let searchCondition = {
      q: query,
      lang: 'ja',
      result_type: 'recent',
      count: 100,
      max_id: null,
    };

    // 検索を実行
    let tweets = [];
    for (let i = 0; i < 5; i++) {
      console.log(keyword, i);
      let tweetsofPage = await this.searchTweets(socialAccountId, searchCondition);
      tweets = tweets.concat(tweetsofPage);

      if (tweetsofPage.length == 0) {
        // ツイートがなければ、ループを終了
        console.log('end');
        break;
      } else if (minNumOfTweets <= tweets.length) {
        // 指定件数以上取得できたら、ループを終了
        break;
      }

      // 次ページを取得するために、最後のツイートのIDから1引いて、maxIdに指定
      searchCondition.max_id = tweetsofPage[tweetsofPage.length - 1].id_str;
      console.log(`next is ${searchCondition.max_id} ${keyword}`);
    }
    return tweets;
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
}
