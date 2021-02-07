import { TweetFilterTestHelper } from '@arisucool/im-pact-core';
import FilterTweetTextBayesian from './index';

describe('Initializations', () => {
  test('Basic', () => {
    TweetFilterTestHelper.initModule('FilterTweetTextBayesian', {}, FilterTweetTextBayesian);
  });
});
