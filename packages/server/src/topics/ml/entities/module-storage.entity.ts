import { Entity, Column, BaseEntity, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';
import { IsNotEmpty, IsEmpty } from 'class-validator';

/**
 * モジュール用ストレージのエンティティ
 * (ツイートフィルタ、アクションなどのモジュール用)
 */
@Entity()
export class ModuleStorage extends BaseEntity {
  // ID
  @PrimaryColumn({ length: 255 })
  id: string;

  // 値 (JSONデータ)
  @Column({
    type: 'text',
  })
  @IsNotEmpty()
  value: string;
}
