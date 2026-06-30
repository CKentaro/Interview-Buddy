import type { Answer } from "@/domain/interview/model/Answer";
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis";
import type {
  CreateFollowUpQuestionInput,
  IInterviewSessionRepository,
  QuestionAnswerPair,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import type { Question } from "@/domain/interview/model/Question";
import { QuestionType } from "@/domain/interview/model/QuestionType";
import type {
  EvaluationAxis as PrismaEvaluationAxis,
  QuestionType as PrismaQuestionType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// ── Prisma の enum 値 ⇔ ドメインの enum 値（値は同一だが型を明示的に橋渡しする）──

const AXIS_TO_DOMAIN: Record<PrismaEvaluationAxis, EvaluationAxis> = {
  REPRODUCIBILITY: EvaluationAxis.REPRODUCIBILITY,
  VALUES_JUDGMENT: EvaluationAxis.VALUES_JUDGMENT,
  SELF_AWARENESS: EvaluationAxis.SELF_AWARENESS,
  WORLDVIEW: EvaluationAxis.WORLDVIEW,
};

const AXIS_TO_PRISMA: Record<EvaluationAxis, PrismaEvaluationAxis> = {
  [EvaluationAxis.REPRODUCIBILITY]: "REPRODUCIBILITY",
  [EvaluationAxis.VALUES_JUDGMENT]: "VALUES_JUDGMENT",
  [EvaluationAxis.SELF_AWARENESS]: "SELF_AWARENESS",
  [EvaluationAxis.WORLDVIEW]: "WORLDVIEW",
};

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

/**
 * IInterviewSessionRepository の Prisma 実装。
 * ドメイン層が定義したインターフェースを Prisma で実装する（依存性逆転）。
 */
export class PrismaInterviewSessionRepository
  implements IInterviewSessionRepository
{
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
