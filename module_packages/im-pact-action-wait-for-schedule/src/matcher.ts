import { ExtractedTweet } from '@arisucool/im-pact-core';

expect.extend({
  toBeSorted: (received: any, tweets: ExtractedTweet[], sortProperty: string, isAsc: boolean) => {
    // Find the allowed tweet
    let allowedItem = null;
    for (const key of Object.keys(received)) {
      if (received[key] === true) {
        const extractedTweetId = parseInt(key);
        allowedItem = tweets.find((tweet: ExtractedTweet) => {
          return tweet.id === extractedTweetId;
        });
        break;
      }
    }

    if (!allowedItem) {
      return {
        message: () => 'There is no allowed item',
        pass: false,
      };
    }

    // Find the denied tweet
    let deniedItem = null;
    for (const key of Object.keys(received)) {
      if (received[key] === false) {
        const extractedTweetId = parseInt(key);
        deniedItem = tweets.find((tweet: ExtractedTweet) => {
          return tweet.id === extractedTweetId;
        });
        break;
      }
    }

    if (!deniedItem) {
      return {
        message: () => 'There is no denied item',
        pass: false,
      };
    }

    // Check the difference in value between allowed and denied tweets
    let pass = false;
    if (isAsc && allowedItem[sortProperty] <= deniedItem[sortProperty]) {
      pass = true;
    } else if (!isAsc && deniedItem[sortProperty] <= allowedItem[sortProperty]) {
      pass = true;
    }

    // Return result
    if (pass) {
      return {
        message: () =>
          isAsc
            ? `${sortProperty} values were in ascending order from allowed tweet (${allowedItem[sortProperty]}) to denied tweet (${deniedItem[sortProperty]})`
            : `${sortProperty} values were in descending order from allowed tweet (${allowedItem[sortProperty]}) to denied tweet (${deniedItem[sortProperty]})`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          isAsc
            ? `${sortProperty} values were not in ascending order from allowed tweet (${allowedItem[sortProperty]}) to denied tweet (${deniedItem[sortProperty]})`
            : `${sortProperty} values were not in descending order from allowed tweet (${allowedItem[sortProperty]}) to denied tweet (${deniedItem[sortProperty]})`,
        pass: false,
      };
    }
  },
});
