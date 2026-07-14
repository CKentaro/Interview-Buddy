import type { EvaluationAxis, QuestionType } from "@/generated/prisma/enums";

// ─── Session list ────────────────────────────────────────────
export type SessionListItemResponse = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  companyName: string | null;
  industryMajor: string | null;
  industryMinor: string | null;
  jobMajor: string | null;
  jobMinor: string | null;
  selectionStage: string | null;
  interviewerType: string | null;
  questionCount: number;
  hasFeedback: boolean;
};

export type SessionListResponse = {
  sessions: SessionListItemResponse[];
};

// ─── Session detail ───────────────────────────────────────────
export type QuestionWithAnswer = {
  id: string;
  type: QuestionType;
  content: string;
  displayOrder: number;
  primaryAxis: EvaluationAxis | null;
  parentQuestionId: string | null;
  answer: { id: string; content: string } | null;
};

export type SessionDetailResponse = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  companyName: string | null;
  industryMajor: string | null;
  industryMinor: string | null;
  jobMajor: string | null;
  jobMinor: string | null;
  selectionStage: string | null;
  interviewerType: string | null;
  questions: QuestionWithAnswer[];
  // 面接終了後フィードバック画面／履歴詳細で QA と一緒に表示する評価を status 付きで埋め込む。
  // フィードバック生成は非同期のため、完了前は generating / failed を返す（GET /sessions/[id] は
  // このリソースを 1 本で返し、完了待ちのポーリングだけ軽量な GET /sessions/[id]/feedback を使う）。
  feedback: FeedbackResponse;
};

// ─── User me ─────────────────────────────────────────────────
export type UserMeResponse = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  totalSessions: number;
  lastSessionAt: string | null;
};

// ─── Session create ───────────────────────────────────────────
export type CreateSessionRequest = {
  companyName?: string;
  industryMajor?: string;
  industryMinor?: string;
  jobMajor?: string;
  jobMinor?: string;
  selectionStage?: string;
  interviewerType?: string;
  voiceEnabled?: boolean;
};

export type QuestionResponse = {
  id: string;
  type: QuestionType;
  text: string; //画面表示用の質問文
  speechText?: string; //読み上げ用文章
  parentQuestionId: string | null;
};

export type SessionResponse = {
  sessionId: string;
  createdAt: string;
  firstQuestion: QuestionResponse;
  /**
   * 実際に音声読み上げが有効化されたか。要求しても本日の音声枠が使用済みなら false。
   * クライアントはこの値で TTS 実行可否・フォールバック通知を判断する。
   */
  voiceEnabled: boolean;
};

// UC03: 回答送信 & 深掘り質問生成

export type SubmitAnswerRequest = {
  questionId: string;
  answerText: string;
  voiceEnabled?: boolean;
};

export type NextQuestionResponse = {
  id: string;
  type: QuestionType;
  text: string;
  parentQuestionId: string | null;
  speechText?: string;
};

// 継続なら必ず次の質問があり、終了なら必ず null。
// 矛盾した組み合わせ（終了なのに次の質問がある等）を型で表現できないようにする。
export type AnswerResponse =
  | { answerId: string; isSessionComplete: false; nextQuestion: NextQuestionResponse }
  | { answerId: string; isSessionComplete: true; nextQuestion: null };

// ─── 音声利用枠（1日あたりの音声ありセッション残回数）─────────────
export type VoiceUsageResponse = {
  /** 1 日あたりの上限回数。 */
  limit: number;
  /** 本日すでに使った回数。 */
  used: number;
  /** 本日の残り回数（0 以上）。 */
  remaining: number;
};

// ─── TTS（読み上げ音声合成）───────────────────────────────────
export type TtsRequest = {
  text: string;
  /** 対象セッション。音声あり(voiceEnabled=true)かつ本人のセッションのみ合成を許可する。 */
  sessionId: string;
};

export type TtsResponse = {
  /** base64 エンコードされた PCM 音声（クライアントが Web Audio でデコード）。 */
  audio: string;
};

// UC06: フィードバック取得

export type AxisFeedbackResult = {
  axis: EvaluationAxis;
  // 表示用の日本語ラベル。enum をキーにしたラベルマップから引く想定。
  axisLabel: string;
  comment: string;
};

export type FeedbackResponse =
  | { status: "generating" }
  | { status: "failed" }
  | {
      status: "completed";
      feedbackId: string;
      overallComment: string;
      axisFeedbacks: AxisFeedbackResult[];
    };
