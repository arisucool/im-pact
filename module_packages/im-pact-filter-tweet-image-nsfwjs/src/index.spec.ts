import { TweetFilterTestHelper } from '@arisucool/im-pact-core';
import FilterTweetImageNsfwjs from './index';

describe('Initializations', () => {
  test('Basic', () => {
    TweetFilterTestHelper.initModule('FilterTweetImageNsfwjs', {}, FilterTweetImageNsfwjs);
  });
});
