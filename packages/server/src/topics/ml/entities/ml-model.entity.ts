import { Entity, Column, BaseEntity, PrimaryGeneratedColumn, PrimaryColumn, ManyToOne } from 'typeorm';
import { IsNotEmpty, IsEmpty } from 'class-validator';
import { Topic } from 'src/topics/entities/topic.entity';

/**
 * 学習モデルストレージのエンティティ
 */
@Entity()
export class MlModel extends BaseEntity {
  // ID
  @PrimaryGeneratedColumn()
  id: number;

  // トピック
  @ManyToOne(
    () => Topic,
    topic => topic.mlModels,
  )
  topic: Topic;

  // モデルデータ (mode.json)
  @Column({
    type: 'bytea',
    nullable: false,
  })
  @IsNotEmpty()
  modelData: Buffer;

  // モデルデータ (weights.bin)
  @Column({
    type: 'bytea',
    nullable: false,
  })
  @IsNotEmpty()
  modelWeightsData: Buffer;
}
