import { ApiProperty } from '@nestjs/swagger';

export class FilterPatternSettings {
  @ApiProperty({
    description: 'ディープラーニング分類器をトレーニングするときのエポック数',
    example: 30,
    type: Number,
  })
  numOfMlEpochs: number;

  @ApiProperty({
    description: 'ディープラーニング分類器をトレーニングするときの学習率',
    example: 0.1,
    type: Number,
  })
  mlLearningRate: number;

  @ApiProperty({
    description: 'ディープラーニング分類器をトレーニングするときの損失関数',
    example: 'categoricalCrossentropy',
    type: String,
  })
  mlLossFunction: 'categoricalCrossentropy';

  @ApiProperty({
    description: 'ディープラーニング分類器をトレーニングするときのオーバーサンプリングの有効化',
    example: true,
    type: Boolean,
  })
  mlEnableOverSampling: boolean;
}

export class FilterPattern {
  @ApiProperty({
    description: 'パターン名',
    example: 'パターン 1',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'スコア',
    example: 80,
    type: Number,
  })
  score: number;

  @ApiProperty({
    description: '学習モデルのID',
    example: 0,
    type: Number,
  })
  trainedModelId: number;

  filters: any[];

  @ApiProperty({
    description: 'フィルタパターンの拡張設定',
    example: {},
    type: FilterPatternSettings,
  })
  settings: FilterPatternSettings;
}
