import type { Answer } from "@/domain/interview/model/Answer.entity";
import type { InterviewSession } from "@/domain/interview/model/InterviewSession.entity";
import type {
  CreateFollowUpQuestionInput,
  CreateSessionInput,
  CreateSessionResult,
  IInterviewSessionRepository,
  QuestionAnswerPair,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import type { Question } from "@/domain/interview/model/Question.entity";
import { QuestionType } from "@/domain/interview/model/QuestionType.vo";
import type {
  EvaluationAxis as PrismaEvaluationAxis,
  QuestionType as PrismaQuestionType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { AXIS_TO_DOMAIN, AXIS_TO_PRISMA } from "./evaluationAxisMapping";

// ── Prisma の QuestionType ⇔ ドメインの QuestionType（値は同一だが型を明示的に橋渡しする）──

const TYPE_TO_DOMAIN: Record<PrismaQuestionType, QuestionType> = {
  MAIN: QuestionType.MAIN,
  FOLLOW_UP: QuestionType.FOLLOW_UP,
};

type PrismaQuestionRow = {
  id: string;
  type: PrismaQuestionType;
  content: string;
  displayOrder: number;
  depthCount: number;
  primaryAxis: PrismaEvaluationAxis | null;
  parentQuestionId: string | null;
};

type PrismaInterviewSessionRow = {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  companyName: string | null;
  industryMajor: string | null;
  industryMinor: string | null;
  jobMajor: string | null;
  jobMinor: string | null;
  selectionStage: string | null;
  interviewerType: string | null;
};

function toDomainQuestion(row: PrismaQuestionRow): Question {
  return {
    id: row.id,
    type: TYPE_TO_DOMAIN[row.type],
    content: row.content,
    displayOrder: row.displayOrder,
    depthCount: row.depthCount,
    primaryAxis: row.primaryAxis === null ? null : AXIS_TO_DOMAIN[row.primaryAxis],
    parentQuestionId: row.parentQuestionId,
  };
}

function toDomainInterviewSession(
  row: PrismaInterviewSessionRow,
  questions: Question[],
): InterviewSession {
  return {
    id: row.id,
    userId: row.userId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    companyName: row.companyName,
    industryMajor: row.industryMajor,
    industryMinor: row.industryMinor,
    jobMajor: row.jobMajor,
    jobMinor: row.jobMinor,
    selectionStage: row.selectionStage,
    interviewerType: row.interviewerType,
    questions,
  };
}

/**
 * IInterviewSessionRepository の Prisma 実装。
 * ドメイン層が定義したインターフェースを Prisma で実装する（依存性逆転）。
 */
export class PrismaInterviewSessionRepository
  implements IInterviewSessionRepository
{
  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    return prisma.$transaction(async (tx) => {
      const sessionRow = await tx.interviewSession.create({
        data: {
          userId: input.userId,
          jobMajor: input.jobTitle,
          companyName: input.companyName,
          industryMajor: input.industryMajor,
          industryMinor: input.industryMinor,
          jobMinor: input.jobMinor,
          selectionStage: input.selectionStage,
          interviewerType: input.interviewerType,
        },
      });

      await tx.question.createMany({
        data: input.selectedQuestions.map((question) => ({
          type: "MAIN",
          content: question.displayText,
          displayOrder: question.displayOrder,
          primaryAxis: AXIS_TO_PRISMA[question.axis],
          sessionId: sessionRow.id,
        })),
      });

      const questionRows = await tx.question.findMany({
        where: { sessionId: sessionRow.id },
        orderBy: { displayOrder: "asc" },
      });
      const questions = questionRows.map(toDomainQuestion);
      const firstQuestion = questions.find((question) => question.displayOrder === 1);
      if (!firstQuestion) {
        throw new Error("First main question was not created");
      }

      return {
        session: toDomainInterviewSession(sessionRow, questions),
        firstQuestion,
      };
    });
  }

  async findQuestionById(questionId: string): Promise<Question | null> {
    const row = await prisma.question.findUnique({ where: { id: questionId } });
    return row === null ? null : toDomainQuestion(row);
  }

  async findNextMainQuestion(
    sessionId: string,
    currentMainDisplayOrder: number,
  ): Promise<Question | null> {
    const row = await prisma.question.findFirst({
      where: {
        sessionId,
        type: "MAIN",
        displayOrder: currentMainDisplayOrder + 1,
      },
    });
    return row === null ? null : toDomainQuestion(row);
  }

  async getMaxDisplayOrder(sessionId: string): Promise<number> {
    const result = await prisma.question.aggregate({
      where: { sessionId },
      _max: { displayOrder: true },
    });
    return result._max.displayOrder ?? 0;
  }

  async findConversationHistory(
    sessionId: string,
    parentMainQuestionId: string,
  ): Promise<QuestionAnswerPair[]> {
    const rows = await prisma.question.findMany({
      where: {
        sessionId,
        OR: [
          { id: parentMainQuestionId },
          { parentQuestionId: parentMainQuestionId },
        ],
      },
      include: { answer: true },
      orderBy: { displayOrder: "asc" },
    });
    return rows.map((row) => ({
      questionText: row.content,
      answerText: row.answer?.content ?? null,
    }));
  }

  async saveAnswer(questionId: string, content: string): Promise<Answer> {
    const row = await prisma.answer.create({ data: { content, questionId } });
    return { id: row.id, content: row.content, questionId: row.questionId };
  }

  async createFollowUpQuestion(
    input: CreateFollowUpQuestionInput,
  ): Promise<Question> {
    const row = await prisma.question.create({
      data: {
        type: "FOLLOW_UP",
        content: input.content,
        displayOrder: input.displayOrder,
        depthCount: input.depthCount,
        primaryAxis:
          input.primaryAxis === null ? null : AXIS_TO_PRISMA[input.primaryAxis],
        sessionId: input.sessionId,
        parentQuestionId: input.parentMainQuestionId,
      },
    });
    return toDomainQuestion(row);
  }

  async completeSession(sessionId: string): Promise<void> {
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });
  }
}
