import { ActionTestHelper, ExtractedTweet } from '@arisucool/im-pact-core';
import ActionWaitForSchedule from './index';

import './matcher';

describe('Initializations', () => {
  test('Basic', () => {
    ActionTestHelper.initModule('ActionWaitForSchedule', {}, ActionWaitForSchedule);
  });
});

describe('execAction', () => {
  test('Allow all items', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 10,
        sortConditionOfTweets: null,
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toMatchObject({
      '0': true,
      '1': true,
      '2': true,
      '3': true,
      '4': true,
      '5': true,
      '6': true,
      '7': true,
      '8': true,
      '9': true,
    });
  });
  test('Allow only 1 items', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 1,
        sortConditionOfTweets: null,
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toMatchObject({
      '0': true,
      '1': false,
      '2': false,
      '3': false,
      '4': false,
      '5': false,
      '6': false,
      '7': false,
      '8': false,
      '9': false,
    });
  });

  test('Allow all items with specified multi schedules', async () => {
    const scheduleA = new Date();
    scheduleA.setMinutes(-5);
    const scheduleB = new Date();

    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 10,
        sortConditionOfTweets: null,
        schedule: `${scheduleA.getMinutes()} * * * *
${scheduleB.getMinutes()} * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toMatchObject({
      '0': true,
      '1': true,
      '2': true,
      '3': true,
      '4': true,
      '5': true,
      '6': true,
      '7': true,
      '8': true,
      '9': true,
    });
  });

  test('Allow all items with specified multi schedules (includes invalid line, empty line, whitespace line)', async () => {
    const scheduleA = new Date();
    scheduleA.setMinutes(-5);
    const scheduleB = new Date();

    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 10,
        sortConditionOfTweets: null,
        schedule: `${scheduleA.getMinutes()} * * * *
this is invalid string
                      

${scheduleB.getMinutes()} * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toMatchObject({
      '0': true,
      '1': true,
      '2': true,
      '3': true,
      '4': true,
      '5': true,
      '6': true,
      '7': true,
      '8': true,
      '9': true,
    });
  });

  test('Deny all items because it is not on the specified schedule', async () => {
    const schedule = new Date();
    schedule.setMinutes(-5);

    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 10,
        sortConditionOfTweets: null,
        schedule: `${schedule.getMinutes()} * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toMatchObject({
      '0': false,
      '1': false,
      '2': false,
      '3': false,
      '4': false,
      '5': false,
      '6': false,
      '7': false,
      '8': false,
      '9': false,
    });
  });

  test('Deny all items because it is not on the specified multi schedule', async () => {
    const scheduleA = new Date();
    scheduleA.setMinutes(-5);
    const scheduleB = new Date();
    scheduleB.setHours(-1);

    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 10,
        sortConditionOfTweets: null,
        schedule: `${scheduleA.getMinutes()} * * * *
* ${scheduleB.getHours()} * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toMatchObject({
      '0': false,
      '1': false,
      '2': false,
      '3': false,
      '4': false,
      '5': false,
      '6': false,
      '7': false,
      '8': false,
      '9': false,
    });
  });

  test('Deny all items because maxNumOfTweetsAtOneTime is 0', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 0,
        sortConditionOfTweets: null,
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toMatchObject({
      '0': false,
      '1': false,
      '2': false,
      '3': false,
      '4': false,
      '5': false,
      '6': false,
      '7': false,
      '8': false,
      '9': false,
    });
  });

  test('Throw error because schedule setting is empty', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 2,
        sortConditionOfTweets: null,
        schedule: '',
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    await expect(mod.execActionBulk(tweets)).rejects.toThrow();
  });

  test('Throw error because schedule setting is only whitespaces', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 2,
        sortConditionOfTweets: null,
        schedule: `            
`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    await expect(mod.execActionBulk(tweets)).rejects.toThrow();
  });

  test('Throw error because maxNumOfTweetsAtOneTime setting is negative number', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: -1,
        sortConditionOfTweets: null,
        schedule: '* * * * *',
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    await expect(mod.execActionBulk(tweets)).rejects.toThrow();
  });
});

describe('execAction - sortConditionOfTweets option', () => {
  test('crawledRetweetsAsc', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 1,
        sortConditionOfTweets: 'crawledRetweetsAsc',
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toBeSorted(tweets, 'crawledRetweetCount', true);
  });

  test('crawledRetweetsDesc', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 1,
        sortConditionOfTweets: 'crawledRetweetsDesc',
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toBeSorted(tweets, 'crawledRetweetCount', false);
  });

  test('createdAtAsc', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 1,
        sortConditionOfTweets: 'createdAtAsc',
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toBeSorted(tweets, 'createdAt', true);
  });

  test('createdAtDesc', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 1,
        sortConditionOfTweets: 'createdAtDesc',
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toBeSorted(tweets, 'createdAt', false);
  });

  test('crawledAtAsc', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 1,
        sortConditionOfTweets: 'crawledAtAsc',
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toBeSorted(tweets, 'crawledAt', true);
  });

  test('crawledAtDesc', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 1,
        sortConditionOfTweets: 'crawledAtDesc',
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toBeSorted(tweets, 'crawledAt', false);
  });

  test('extractedAtAsc', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 1,
        sortConditionOfTweets: 'extractedAtAsc',
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toBeSorted(tweets, 'extractedAt', true);
  });

  test('extractedAtDesc', async () => {
    const mod: ActionWaitForSchedule = ActionTestHelper.initModule(
      'ActionWaitForSchedule',
      {
        maxNumOfTweetsAtOneTime: 1,
        sortConditionOfTweets: 'extractedAtDesc',
        schedule: `* * * * *`,
      },
      ActionWaitForSchedule,
    );

    const tweets = ActionTestHelper.getTweets();
    expect(await mod.execActionBulk(tweets)).toBeSorted(tweets, 'extractedAt', false);
  });
});
