import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TweetFilterService } from './tweet-filter.service';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ModuleStorage } from './entities/module-storage.entity';
import { CrawledTweet } from './entities/crawled-tweet.entity';

describe('TweetFilterService', () => {
  let tweetFilterService: TweetFilterService;
  let moduleStorageRepository: Repository<ModuleStorage>;
  let socialAccountRepository: Repository<SocialAccount>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        TweetFilterService,
        {
          provide: getRepositoryToken(SocialAccount),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ModuleStorage),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(CrawledTweet),
          useClass: Repository,
        },
      ],
    }).compile();

    tweetFilterService = moduleRef.get<TweetFilterService>(TweetFilterService);
    moduleStorageRepository = moduleRef.get<Repository<ModuleStorage>>(getRepositoryToken(ModuleStorage));
    socialAccountRepository = moduleRef.get<Repository<SocialAccount>>(getRepositoryToken(SocialAccount));
  });

  describe('getAvailableTweetFilters', () => {
    it('There are built-in tweet filters', async () => {
      jest.spyOn(moduleStorageRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(socialAccountRepository, 'find').mockResolvedValue([]);

      const filters = await tweetFilterService.getAvailableTweetFilters();

      expect(filters).toEqual(
        expect.objectContaining({
          ProfileLikeFollowerBayesian: {
            description: expect.any(String),
            features: {
              batch: true,
              train: true,
            },
            scope: expect.any(String),
            settings: expect.any(Array),
            version: expect.any(String),
          },
          TfCgIllustImageClassification: {
            description: expect.any(String),
            features: {
              batch: false,
              train: false,
            },
            scope: expect.any(String),
            settings: expect.any(Array),
            version: expect.any(String),
          },
          TweetTextBayesian: {
            description: expect.any(String),
            features: {
              batch: false,
              train: true,
            },
            scope: expect.any(String),
            settings: expect.any(Array),
            version: expect.any(String),
          },
        }),
      );
    });
  });
});
