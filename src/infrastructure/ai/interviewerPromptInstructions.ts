import type { InterviewerType } from "@/domain/interview/model/InterviewerType.vo";

const INTERVIEWER_TYPE_INSTRUCTIONS: Record<InterviewerType, string> = {
  friendly: `- 温かく親しみやすい口調を使ってください。
- 相づちや質問へのつなぎには、応募者が安心できる柔らかな表現を使ってください。
- 応募者を誘導したり、根拠なく過剰に称賛したりしないでください。`,
  neutral: `- 丁寧で落ち着いた、標準的な面接の口調を使ってください。
- 回答への反応は簡潔にし、評価をにおわせないでください。
- 質問の意図が伝わる明瞭な表現を使ってください。`,
  strict: `- 落ち着きと緊張感のある、簡潔で厳格な口調を使ってください。
- 相づちや質問へのつなぎは短くし、過剰な称賛や共感を避けてください。
- 威圧、侮辱、人格否定はせず、回答内容に対してのみ厳しく向き合ってください。`,
};

const CONTENT_INVARIANT =
  "- 質問の目的、評価基準、深掘り方針、出力形式は共通の指示に従い、面接官タイプによって変更しないでください。";

/** 基本プロンプトへ後付けする、面接官タイプ固有の指示だけを返す。 */
export function getInterviewerPromptInstruction(
  interviewerType: InterviewerType,
): string {
  return `${INTERVIEWER_TYPE_INSTRUCTIONS[interviewerType]}\n${CONTENT_INVARIANT}`;
}
