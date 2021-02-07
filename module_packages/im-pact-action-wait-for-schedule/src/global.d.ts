declare namespace jest {
  interface Matchers<R> {
    toBeSorted(tweets: ExtractedTweet[], sortProperty: string, isAsc: boolean): R;
  }
}
