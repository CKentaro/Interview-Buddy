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
  type: string;
  content: string;
  displayOrder: number;
  primaryAxis: string | null;
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
  jobTitle?: string;
  companyName?: string;
  industryMajor?: string;
  industryMinor?: string;
  jobMinor?: string;
  selectionStage?: string;
  difficulty?: string;
  interviewerType?: string;
  voiceEnabled?: boolean;
};

export type QuestionResponse = {
  id: string;
  type: string;
  text: string;
  speechText: string;
  parentQuestionId: string | null;
};

export type SessionResponse = {
  sessionId: string;
  createdAt: string;
  firstQuestion: QuestionResponse;
};

// UC03: 回答送信 & 深掘り質問生成

export type SubmitAnswerRequest = {
  questionId: string;
  answerText: string;
  voiceEnabled?: boolean;
};

export type NextQuestionResponse = {
  id: string;
  type: string;           // 'MAIN' | 'FOLLOW_UP'
  text: string;
  parentQuestionId: string | null;
  speechText?: string;    // FOLLOW_UP のときのみ。フロントが TTS に渡す
};

export type AnswerResponse = {
  answerId: string;
  nextQuestion: NextQuestionResponse | null;
  isSessionComplete: boolean;
};

// UC06: フィードバック取得

import { EvaluationAxis } from "@/generated/prisma/enums";

export type AxisEvaluationResult = {
  axis: EvaluationAxis;
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
      axisEvaluations: AxisEvaluationResult[];
    };
