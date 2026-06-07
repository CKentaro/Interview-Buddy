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
