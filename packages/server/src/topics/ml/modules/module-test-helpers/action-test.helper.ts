import { ActionHelper } from '../module-helpers/action.helper';
import { ExtractedTweet } from '../../entities/extracted-tweet.entity';

/**
 * アクションモジュールのテストを実装するためのヘルパ
 */
export class ActionTestHelper {
  /**
   * アクションモジュールの初期化
   * @param moduleName アクションモジュール名 (例: 'ActionWaitForSeconds')
   * @param moduleSetting モジュール設定
   * @param moduleClass 初期化するモジュールのクラス
   */
  public static initModule(moduleName: string, moduleSetting: { [key: string]: any }, moduleClass: any) {
    return new moduleClass(this.getMockHelper(moduleName, moduleSetting));
  }

  /**
   * テスト用ツイートの取得
   */
  public static getTweet(): ExtractedTweet {
    return {
      id: 0,
      idStr: '1353767902541869056',
      createdAt: new Date('Mon Jan 25 17:00:00 +0000 2021'),
      crawlQuery: 'arisucool',
      crawlLanguage: 'ja',
      text: 'テスト #arisucool',
      userIdStr: '1157995803937427457',
      userName: 'mugip 🍓',
      userScreenName: 'mugiply',
      url: 'https://twitter.com/mugiply/status/1353767902541869056',
      hashtags: ['arisucool'],
      crawledRetweetCount: 0,
      crawledRetweetIdStrs: [],
      originalIdStr: null,
      originalCreatedAt: null,
      originalUserIdStr: null,
      originalUserName: null,
      originalUserScreenName: null,
      rawJSONData: `{"created_at":"Mon Jan 25 18:13:14 +0000 2021","id":1353767902541869056,"id_str":"1353767902541869056","text":"\u30c6\u30b9\u30c8","truncated":false,"entities":{"hashtags":[],"symbols":[],"user_mentions":[],"urls":[]},"metadata":{"iso_language_code":"ja","result_type":"recent"},"source":"\u003ca href=\"http:\/\/twitter.com\/download\/android\" rel=\"nofollow\"\u003eTwitter for Android\u003c\/a\u003e","in_reply_to_status_id":null,"in_reply_to_status_id_str":null,"in_reply_to_user_id":null,"in_reply_to_user_id_str":null,"in_reply_to_screen_name":null,"user":{"id":1157995803937427457,"id_str":"1157995803937427457","name":"mugip \ud83c\udf53","screen_name":"mugiply","location":"\u4e0a\u65b9\u30a8\u30ea\u30a2","description":"\u30cb\u30ef\u30abP\u3067\u3059\u304c\u3001\u304c\u3093\u3070\u308a\u307e\u30fc!! ...\u6700\u8fd1\u306f #\u3042\u308a\u304b\u3064 \u4eba\u529b\u30dc\u30c3\u30c8\u3068\u5316\u3057\u3064\u3064\u3042\u308b\u304a\u3058\u3055\u3093\u3002\n\u3000\u3042\u308a\u3059\u3061\u3083\u3093\u306e\u30a4\u30e9\u30b9\u30c8\u3092\u304a\u5c4a\u3051\u3059\u308b\u30dc\u30c3\u30c8\u3092\u958b\u767a\u3057\u307e\u3057\u305f!! \u261b @arisucool \u261a \n\u3000\u3000\n\u3010\u30c7\u30ec\u30de\u30b9\u3011\ud83c\udf53 \u3042\u308a\u3059 \ud83c\udf53\n\u3000\u3010\u30b7\u30e3\u30cb\u30de\u30b9\u3011\ud83d\udd4a\ufe0f \u307e\u306e \ud83d\udd4a\ufe0f \/ \ud83d\udc58 \u308a\u3093\u305c \ud83d\udc58","url":"https:\/\/t.co\/XbHLdIfGVh","entities":{"url":{"urls":[{"url":"https:\/\/t.co\/XbHLdIfGVh","expanded_url":"https:\/\/github.com\/mugiply","display_url":"github.com\/mugiply","indices":[0,23]}]},"description":{"urls":[]}},"protected":false,"followers_count":100,"friends_count":133,"listed_count":3,"created_at":"Sun Aug 04 12:44:48 +0000 2019","favourites_count":8084,"utc_offset":null,"time_zone":null,"geo_enabled":false,"verified":false,"statuses_count":4262,"lang":null,"contributors_enabled":false,"is_translator":false,"is_translation_enabled":false,"profile_background_color":"F5F8FA","profile_background_image_url":null,"profile_background_image_url_https":null,"profile_background_tile":false,"profile_image_url":"http:\/\/pbs.twimg.com\/profile_images\/1289594904276922368\/xX3zKqgN_normal.png","profile_image_url_https":"https:\/\/pbs.twimg.com\/profile_images\/1289594904276922368\/xX3zKqgN_normal.png","profile_banner_url":"https:\/\/pbs.twimg.com\/profile_banners\/1157995803937427457\/1596297365","profile_link_color":"1DA1F2","profile_sidebar_border_color":"C0DEED","profile_sidebar_fill_color":"DDEEF6","profile_text_color":"333333","profile_use_background_image":true,"has_extended_profile":true,"default_profile":true,"default_profile_image":false,"following":null,"follow_request_sent":null,"notifications":null,"translator_type":"none"},"geo":null,"coordinates":null,"place":null,"contributors":null,"is_quote_status":false,"retweet_count":0,"favorite_count":0,"favorited":false,"retweeted":false,"lang":"ja"}`,
      extractedAt: new Date('Mon Jan 25 19:00:00 +0000 2021'),
      socialAccount: null,
      topic: null,
      predictedClass: 'accept',
      filtersResult: [
        {
          filterName: 'Test',
          result: {
            summary: {
              summaryText: 'This tweet text should be accepted',
              evidenceText: 'テスト #arisucool',
            },
            values: {
              probabilityOfAccept: {
                title: 'Probability that the tweet text will be approved',
                value: 0.5,
              },
              probabilityOfReject: {
                title: 'Probability that the tweet text will be rejected',
                value: 0.2,
              },
            },
          },
        },
      ],
      completeActionIndex: -1,
      lastActionIndex: -1,
      lastActionExecutedAt: null,
      lastActionError: null,
      crawledAt: new Date('Mon Jan 25 18:00:00 +0000 2021'),
      imageUrls: [],
      hasId: null,
      recover: null,
      reload: null,
      remove: null,
      save: null,
      softRemove: null,
      moduleData: '{}',
    };
  }

  /**
   * テスト用ツイートの取得
   */
  public static getTweets(): ExtractedTweet[] {
    let tweets = [];
    for (let i = 0; i < 10; i++) {
      let randomMinutesDiff = Math.floor(Math.random() * 1440) + 10;
      const tweet = ActionTestHelper.getTweet();
      tweet.createdAt.setMinutes(-randomMinutesDiff);
      tweet.crawledAt.setMinutes(-randomMinutesDiff);
      tweet.extractedAt.setMinutes(-randomMinutesDiff);
      tweets.push(tweet);
    }

    // extractedAt で昇順ソート
    tweets.sort((a, b) => {
      return a.extractedAt.getTime() < b.extractedAt.getTime() ? -1 : 1;
    });

    // id を振り直す
    tweets = tweets.map((item, index) => {
      item.id = index;
      return item;
    });

    return tweets;
  }

  /**
   * テスト用ヘルパの取得
   */
  protected static getMockHelper(moduleName: string, moduleSetting: any) {
    return ActionHelper.factoryTest(moduleName, moduleSetting);
  }
}
