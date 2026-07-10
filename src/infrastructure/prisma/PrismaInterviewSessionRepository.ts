import type { Answer } from "@/domain/interview/model/Answer.entity";
import type { InterviewSession } from "@/domain/interview/model/InterviewSession.entity";
import type {
  CreateFollowUpQuestionInput,
  CreateSessionInput,
  CreateSessionResult,
  IInterviewSessionRepository,
  InterviewSessionDetail,
  QuestionAnswerPair,
  SaveAnswerAndCompleteSessionInput,
  SaveAnswerAndCreateFollowUpQuestionInput,
  SaveAnswerAndCreateFollowUpQuestionResult,
  SessionSummary,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import { DuplicateAnswerError as DuplicateAnswerErrorClass } from "@/domain/interview/ports/IInterviewSessionRepository";
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function mapDuplicateAnswer<T>(
  questionId: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DuplicateAnswerErrorClass(questionId);
    }
    throw error;
  }
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
          companyName: input.companyName,
          industryMajor: input.industryMajor,
          industryMinor: input.industryMinor,
          jobMajor: input.jobMajor,
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

  async findSessionByIdForUser(
    sessionId: string,
    userId: string,
  ): Promise<InterviewSession | null> {
    const row = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
      include: { questions: { orderBy: { displayOrder: "asc" } } },
    });
    return row === null
      ? null
      : toDomainInterviewSession(row, row.questions.map(toDomainQuestion));
  }

  async deleteOwnedSession(
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    // where に userId を含めて所有を保証（非所有は count 0）。関連は onDelete: Cascade。
    // deleteMany なので対象が無くても throw せず、削除件数で成否を返す。
    const result = await prisma.interviewSession.deleteMany({
      where: { id: sessionId, userId },
    });
    return result.count > 0;
  }

  async findCompletedByUser(userId: string): Promise<SessionSummary[]> {
    const rows = await prisma.interviewSession.findMany({
      where: { userId, endedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        companyName: true,
        industryMajor: true,
        industryMinor: true,
        jobMajor: true,
        jobMinor: true,
        selectionStage: true,
        interviewerType: true,
        _count: { select: { questions: true } },
        feedback: { select: { id: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      companyName: row.companyName,
      industryMajor: row.industryMajor,
      industryMinor: row.industryMinor,
      jobMajor: row.jobMajor,
      jobMinor: row.jobMinor,
      selectionStage: row.selectionStage,
      interviewerType: row.interviewerType,
      questionCount: row._count.questions,
      hasFeedback: row.feedback !== null,
    }));
  }

  async findDetailById(
    userId: string,
    sessionId: string,
  ): Promise<InterviewSessionDetail | null> {
    const row = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        questions: {
          orderBy: { displayOrder: "asc" },
          include: { answer: { select: { id: true, content: true } } },
        },
      },
    });
    if (row === null) {
      return null;
    }

    return {
      id: row.id,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      companyName: row.companyName,
      industryMajor: row.industryMajor,
      industryMinor: row.industryMinor,
      jobMajor: row.jobMajor,
      jobMinor: row.jobMinor,
      selectionStage: row.selectionStage,
      interviewerType: row.interviewerType,
      questions: row.questions.map((q) => ({
        id: q.id,
        type: TYPE_TO_DOMAIN[q.type],
        content: q.content,
        displayOrder: q.displayOrder,
        primaryAxis: q.primaryAxis === null ? null : AXIS_TO_DOMAIN[q.primaryAxis],
        parentQuestionId: q.parentQuestionId,
        answer: q.answer === null ? null : { id: q.answer.id, content: q.answer.content },
      })),
    };
  }

  async findQuestionById(questionId: string): Promise<Question | null> {
    const row = await prisma.question.findUnique({ where: { id: questionId } });
    return row === null ? null : toDomainQuestion(row);
  }

  async findQuestionByIdInSession(
    sessionId: string,
    questionId: string,
  ): Promise<Question | null> {
    const row = await prisma.question.findFirst({
      where: { id: questionId, sessionId },
    });
    return row === null ? null : toDomainQuestion(row);
  }

  async hasAnswerForQuestion(questionId: string): Promise<boolean> {
    const row = await prisma.answer.findUnique({
      where: { questionId },
      select: { id: true },
    });
    return row !== null;
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
      questionId: row.id,
      questionText: row.content,
      answerText: row.answer?.content ?? null,
    }));
  }

  async saveAnswer(questionId: string, content: string): Promise<Answer> {
    const row = await mapDuplicateAnswer(questionId, () =>
      prisma.answer.create({ data: { content, questionId } }),
    );
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

  async saveAnswerAndCreateFollowUpQuestion(
    input: SaveAnswerAndCreateFollowUpQuestionInput,
  ): Promise<SaveAnswerAndCreateFollowUpQuestionResult> {
    return mapDuplicateAnswer(input.answer.questionId, async () => {
      const result = await prisma.$transaction(async (tx) => {
        const answerRow = await tx.answer.create({
          data: {
            content: input.answer.content,
            questionId: input.answer.questionId,
          },
        });

        const questionRow = await tx.question.create({
          data: {
            type: "FOLLOW_UP",
            content: input.followUpQuestion.content,
            displayOrder: input.followUpQuestion.displayOrder,
            depthCount: input.followUpQuestion.depthCount,
            primaryAxis:
              input.followUpQuestion.primaryAxis === null
                ? null
                : AXIS_TO_PRISMA[input.followUpQuestion.primaryAxis],
            sessionId: input.followUpQuestion.sessionId,
            parentQuestionId: input.followUpQuestion.parentMainQuestionId,
          },
        });

        return { answerRow, questionRow };
      });

      return {
        answer: {
          id: result.answerRow.id,
          content: result.answerRow.content,
          questionId: result.answerRow.questionId,
        },
        followUpQuestion: toDomainQuestion(result.questionRow),
      };
    });
  }

  async saveAnswerAndCompleteSession(
    input: SaveAnswerAndCompleteSessionInput,
  ): Promise<Answer> {
    return mapDuplicateAnswer(input.answer.questionId, async () => {
      const answerRow = await prisma.$transaction(async (tx) => {
        const row = await tx.answer.create({
          data: {
            content: input.answer.content,
            questionId: input.answer.questionId,
          },
        });

        await tx.interviewSession.update({
          where: { id: input.sessionId },
          data: { endedAt: new Date() },
        });

        return row;
      });

      return {
        id: answerRow.id,
        content: answerRow.content,
        questionId: answerRow.questionId,
      };
    });
  }

  async completeSession(sessionId: string): Promise<void> {
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });
  }
}
