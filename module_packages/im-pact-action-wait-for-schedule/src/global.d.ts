declare namespace jest {
  interface Matchers<R> {
    toBeSorted(tweets: ClassifiedTweet[], sortProperty: string, isAsc: boolean): R;
  }
}
