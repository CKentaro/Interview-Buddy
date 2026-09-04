import type { EvaluationAxis, QuestionType } from "@/generated/prisma/enums";
import type { InterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import type { InterviewLength } from "@/domain/interview/model/InterviewLength.vo";

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
  /** 企業マスタと紐づいていれば ID。履歴を企業ごとにまとめるのに使う。 */
  companyId: string | null;
  questionCount: number;
  hasFeedback: boolean;
};

export type SessionListResponse = {
  sessions: SessionListItemResponse[];
};

// ─── Paused / resumable sessions ─────────────────────────────
export type ResumableSessionItemResponse = {
  id: string;
  startedAt: string;
  companyName: string | null;
  industryMajor: string | null;
  industryMinor: string | null;
  jobMajor: string | null;
  jobMinor: string | null;
  selectionStage: string | null;
  interviewerType: string | null;
  answeredQuestionCount: number;
};

export type ResumableSessionListResponse = {
  sessions: ResumableSessionItemResponse[];
};

export type PauseSessionResponse = {
  sessionId: string;
  status: "PAUSED";
};

export type ResumeSessionResponse = {
  sessionId: string;
  status: "IN_PROGRESS";
  voiceEnabled: boolean;
  interviewerType: string | null;
  interviewLength: InterviewLength;
  totalQuestionCount: number;
  currentQuestion: QuestionResponse;
  questionNumber: number;
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
  /** 企業マスタと紐づいていれば ID。自由入力の企業では null。 */
  companyId: string | null;
  /** 出題構成（面接の長さ）。「同じ設定でもう一度」の復元に使う。 */
  interviewLength: InterviewLength;
  voiceEnabled: boolean;
  questions: QuestionWithAnswer[];
  // 面接終了後フィードバック画面／履歴詳細で QA と一緒に表示する評価を status 付きで埋め込む。
  // フィードバック生成は非同期のため、完了前は generating / failed を返す（GET /sessions/[id] は
  // このリソースを 1 本で返し、完了待ちのポーリングだけ軽量な GET /sessions/[id]/feedback を使う）。
  feedback: FeedbackResponse;
};

// ─── Company ─────────────────────────────────────────────────
/** 企業名の候補 1 件。設定画面の入力補助と履歴のグループ化に使う。 */
export type CompanyResponse = {
  id: string;
  name: string;
  /** 4 桁の証券コード。非上場なら null。同名企業の見分けに使う。 */
  securitiesCode: string | null;
  isListed: boolean;
  industryLabel: string | null;
};

export type CompanySearchResponse = {
  companies: CompanyResponse[];
};

// ─── User me ─────────────────────────────────────────────────
export type UserMeResponse = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  /** 志望設定。大小がそろってマスタに存在する組み合わせのときだけ値が入る。 */
  industryMajor: string | null;
  industryMinor: string | null;
  jobMajor: string | null;
  jobMinor: string | null;
  /** 初回のプロフィール確認を終えているか（スキップでも true）。 */
  onboardingCompleted: boolean;
  totalSessions: number;
  lastSessionAt: string | null;
};

/**
 * PATCH /api/users/[id] のリクエスト。渡した項目だけを更新する。
 * 志望設定の 4 項目は 1 組として扱い、いずれかを送ったら丸ごと差し替える。
 */
export type UpdateUserRequest = {
  /** 表示名。空文字・null は「未設定に戻す」。 */
  name?: string | null;
  industryMajor?: string | null;
  industryMinor?: string | null;
  jobMajor?: string | null;
  jobMinor?: string | null;
  /** オンボーディングを完了として記録する（スキップ時も true を送る）。 */
  completeOnboarding?: boolean;
};

// ─── 求人ページ解析（UC: 面接設定の自動入力）───────────────────
export type AnalyzeJobPostingRequest = {
  url: string;
};

/** 解析対象ページの種別。ドメインの JobPostingPageKind と値を一致させる。 */
export type JobPostingPageKindResponse =
  | "SINGLE_JOB_POSTING"
  | "JOB_LIST"
  | "COMPANY_RECRUIT_PAGE"
  | "ERROR_OR_LOGIN"
  | "OTHER";

export type EmploymentKindResponse = "NEW_GRADUATE" | "MID_CAREER" | "UNKNOWN";

/**
 * 解析に失敗した理由。UI はこれで文言を出し分け、いずれの場合も
 * 手入力での面接開始は妨げない。
 */
export type JobPostingFailureReason =
  | "INVALID_URL"
  | "UNREACHABLE"
  | "UNSUPPORTED_CONTENT"
  | "EMPTY_CONTENT"
  | "EXTRACTION_FAILED";

export type AnalyzeJobPostingResponse =
  | {
      status: "failed";
      reason: JobPostingFailureReason;
    }
  | {
      status: "analyzed";
      finalUrl: string;
      pageKind: JobPostingPageKindResponse;
      /** 面接質問の生成に使える情報が揃っているか。 */
      usableAsContext: boolean;
      employmentKind: EmploymentKindResponse;
      /** 以下はフォームへ反映する値。抽出できなかった項目は null。 */
      companyName: string | null;
      industryMajor: string | null;
      industryMinor: string | null;
      jobMajor: string | null;
      jobMinor: string | null;
      businessSummary: string | null;
      jobSummary: string | null;
      keyPoints: string[];
      /**
       * 企業名が企業マスタと一致した場合の企業。一致しなければ null で、
       * その場合は企業名の文字列だけがフォームに入る（練習は問題なく開始できる）。
       */
      company: { id: string; name: string } | null;
    };

// ─── Session create ───────────────────────────────────────────
export type CreateSessionRequest = {
  companyName?: string;
  industryMajor?: string;
  industryMinor?: string;
  jobMajor?: string;
  jobMinor?: string;
  selectionStage?: string;
  interviewerType?: InterviewerType;
  voiceEnabled?: boolean;
  /** 短め / 普通 / 長め。未指定時は普通。 */
  interviewLength?: InterviewLength;
  /**
   * 求人ページの解析結果。本質問を求人由来で生成する場合に渡す。
   * POST /api/job-postings/analyze の analyzed レスポンスをそのまま入れる想定。
   */
  jobPosting?: Extract<AnalyzeJobPostingResponse, { status: "analyzed" }>;
  /** 本質問を求人由来の生成に切り替えるか。 */
  generateQuestionsFromJobPosting?: boolean;
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
  interviewLength: InterviewLength;
  totalQuestionCount: number;
  firstQuestion: QuestionResponse;
  /**
   * 実際に音声読み上げが有効化されたか。要求しても本日の音声枠が使用済みなら false。
   * クライアントはこの値で TTS 実行可否・フォールバック通知を判断する。
   */
  voiceEnabled: boolean;
  /**
   * 本質問が求人由来の生成に切り替わったか。要求しても生成に失敗した場合は
   * false（バンク抽選で面接は開始される）。
   */
  questionsGeneratedFromJobPosting: boolean;
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
  interviewerType?: InterviewerType;
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
