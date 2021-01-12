import * as bull from 'bull';

export interface JobStatus {
  // ジョブの状態
  status: bull.JobStatus;

  // ジョブの進捗
  progress: number;

  // ジョブの結果
  result?: { [key: string]: any };

  // ジョブのエラーメッセージ
  errorMessage?: string;

  // ジョブのエラースタック
  errorStacktraces?: string[];
}
