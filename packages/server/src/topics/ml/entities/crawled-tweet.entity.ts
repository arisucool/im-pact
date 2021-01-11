import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  BaseEntity,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  IsNull,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsEmpty } from 'class-validator';
import { SocialAccount } from '../../../social-accounts/entities/social-account.entity';
import { Tweet } from './tweet.entity';

/**
 * 収集済みツイートのエンティティ
 */
@Entity()
@Index(['socialAccount', 'idStr'], { unique: true }) // TODO
export class CrawledTweet extends Tweet {
  // 収集時に使用されたソーシャルアカウント
  @ManyToOne(
    () => SocialAccount,
    socialAccount => socialAccount.crawledTweets,
  )
  socialAccount: SocialAccount;
}
