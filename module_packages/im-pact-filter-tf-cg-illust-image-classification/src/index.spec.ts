import { TweetFilterTestHelper } from '@arisucool/im-pact-core';
import FilterTfCgIllustImageClassification from './index';

describe('Initializations', () => {
  test('Basic', () => {
    TweetFilterTestHelper.initModule('FilterTfCgIllustImageClassification', {}, FilterTfCgIllustImageClassification);
  });
});
