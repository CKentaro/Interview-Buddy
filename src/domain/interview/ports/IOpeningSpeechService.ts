import type { InterviewerType } from "../model/InterviewerType.vo";

/** 開始発話を生成するための入力。 */
export type GenerateOpeningSpeechInput = {
  displayText: string;
  companyName?: string;
  selectionStage?: string;
  interviewerType: InterviewerType;
};

/**
 * 面接開始時の読み上げ文生成に対する契約。
 *
 * 実装は LLM などの外部サービスを使ってよいが、呼び出し側は失敗時に
 * displayText へフォールバックし、面接開始を止めない。
 */
export interface IOpeningSpeechService {
  generate(input: GenerateOpeningSpeechInput): Promise<string>;
}
