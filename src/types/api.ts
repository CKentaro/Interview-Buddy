export type CreateSessionRequest = {
  jobTitle?: string;
  companyName?: string;
  industryMajor?: string;
  industryMinor?: string;
  jobMinor?: string;
  selectionStage?: string;
  difficulty?: string;
  interviewerType?: string;
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
