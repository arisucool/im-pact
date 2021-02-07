import { TweetFilterTestHelper } from '@arisucool/im-pact-core';
import FilterTweetAuthorProfileLikeFollowerBayesian from './index';

describe('Initializations', () => {
  test('Basic', () => {
    TweetFilterTestHelper.initModule(
      'FilterTweetAuthorProfileLikeFollowerBayesian',
      {},
      FilterTweetAuthorProfileLikeFollowerBayesian,
    );
  });
});
