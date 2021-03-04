import { TweetFilterTestHelper } from '@arisucool/im-pact-core';
import FilterTweetSensitiveFlag from './index';

describe('Initializations', () => {
  test('Basic', () => {
    TweetFilterTestHelper.initModule('FilterTweetSensitiveFlag', {}, FilterTweetSensitiveFlag);
  });
});
