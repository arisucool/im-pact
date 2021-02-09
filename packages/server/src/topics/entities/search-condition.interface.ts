export interface SearchCondition {
  keywords: string[];
  language: string;
  to?: string;
  minFaves?: number;
  minRetweets?: number;
  minReplies?: number;
  images?: boolean;
}
