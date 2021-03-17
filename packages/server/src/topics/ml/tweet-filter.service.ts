import { Injectable, Logger } from '@nestjs/common';
import { SocialAccount } from '../../social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TweetFilterManager } from './modules/tweet-filter-manager';
import { ModuleStorage } from './entities/module-storage.entity';
import { TweetFilterRetrainingRequest } from './dto/retrain.dto';
import { CrawledTweet } from './entities/crawled-tweet.entity';
import { Topic } from '../entities/topic.entity';
import { ClassifiedTweet } from './entities/classified-tweet.entity';

@Injectable()
export class TweetFilterService {
  constructor(
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
    @InjectRepository(ModuleStorage)
    private moduleStorageRepository: Repository<ModuleStorage>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
  ) {}

  async retrain(
    tweet: ClassifiedTweet,
    topic: Topic,
    tweetFilterRetrainingRequests: TweetFilterRetrainingRequest[],
  ): Promise<void> {
    // トピックのツイートフィルタパターンを取得
    if (topic.enabledFilterPatternIndex === null || !topic.filterPatterns[topic.enabledFilterPatternIndex]) {
      throw new Error('Invalid filter pattern');
    }
    const filterPattern = topic.filterPatterns[topic.enabledFilterPatternIndex];

    // ツイートフィルタを管理するモジュールを初期化
    const filterManager = new TweetFilterManager(
      this.moduleStorageRepository,
      this.crawledTweetRepository,
      this.socialAccountRepository,
      filterPattern.filters,
      topic.searchCondition.keywords,
    );

    // 各ツイートフィルタによるバッチ処理を実行
    // (バッチ処理が必要なツイートフィルタがあるため、先にバッチ処理を行っておく)
    Logger.log('Executing batches on tweet filters...', 'TweetFilterService/retrain');
    await filterManager.batch();

    // 各ツイートフィルタによる学習処理を実行
    // (学習が必要なツイートフィルタがあるため、先に全ツイートに対する学習を行っておく)
    for (const request of tweetFilterRetrainingRequests) {
      Logger.log(`Retraining tweet on tweet filter (${request.filterId})...`, 'TweetFilterService/retrain');
      try {
        await filterManager.retrainTweet(tweet, request);
      } catch (e) {
        Logger.error(
          `Error occurred during the retraining process on the tweet filter (${request.filterId})...`,
          e.stack,
          'TweetFilterService/retrain',
        );
      }
    }
  }

  /**
   * 利用可能なツイートフィルタの取得
   * @return 利用可能なツイートフィルタの連想配列
   */
  async getAvailableTweetFilters(): Promise<{
    [key: string]: {
      version: string;
      description: string;
      scope: string;
      settings: any;
      features: { train: boolean; batch: boolean };
    };
  }> {
    const filterManager = new TweetFilterManager(
      this.moduleStorageRepository,
      null,
      this.socialAccountRepository,
      [],
      [],
    );
    const filterNames = await filterManager.getAvailableTweetFilterNames();

    const filters: {
      [key: string]: {
        version: string;
        description: string;
        scope: string;
        settings: any;
        features: { train: boolean; batch: boolean };
      };
    } = {};

    for (const filterName of filterNames) {
      let mod = null;
      try {
        mod = await filterManager.getModule(filterName, null, {});
      } catch (e) {
        console.warn(`[MlService] getAvailableTweetFilters - Error = `, e);
        continue;
      }

      if (mod === null) {
        console.warn(`[MlService] getAvailableTweetFilters - This module is null... `, filterName);
        continue;
      }

      filters[filterName] = {
        // フィルタのバージョン
        version: '1.0.0', // TODO:
        // フィルタの説明
        description: mod.getDescription(),
        // フィルタの適用範囲
        scope: mod.getScope(),
        // フィルタ設定の定義
        settings: mod.getSettingsDefinition(),
        // フィルタで提供される機能
        features: {
          // 学習を行うか否か
          train: typeof mod.train === 'function',
          // バッチ処理を行うか否か
          batch: typeof mod.batch === 'function',
        },
      };
    }

    return filters;
  }
}
