/** 次の質問を読み上げる発話文を生成するための入力。 */
export type GenerateQuestionSpeechInput = {
  /** 画面表示用の質問文。失敗時の fallback にも使う。 */
  displayText: string;
  /** 直前に回答された質問文。 */
  previousQuestionText: string;
  /** 直前の回答内容。 */
  previousAnswerText: string;
};

/**
 * 質問の読み上げ文生成に対する契約。
 *
 * 実装は LLM などの外部サービスを使ってよい。呼び出し側は失敗時に
 * displayText へフォールバックし、面接進行を止めない。
 */
export interface IQuestionSpeechService {
  generate(input: GenerateQuestionSpeechInput): Promise<string>;
}
