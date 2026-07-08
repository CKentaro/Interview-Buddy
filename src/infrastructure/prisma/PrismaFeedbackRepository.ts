import { FeedbackAlreadyExistsError } from "@/domain/feedback/errors";
import type { Feedback } from "@/domain/feedback/model/Feedback.entity";
import type {
  IFeedbackRepository,
  NewFeedback,
} from "@/domain/feedback/ports/IFeedbackRepository";
import { Prisma } from "@/generated/prisma/client";
import type { EvaluationAxis as PrismaEvaluationAxis } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { AXIS_TO_DOMAIN, AXIS_TO_PRISMA } from "./evaluationAxisMapping";

type PrismaAxisFeedbackRow = {
  id: string;
  axis: PrismaEvaluationAxis;
  comment: string;
};

type PrismaFeedbackRow = {
  id: string;
  overallComment: string;
  sessionId: string;
  axisFeedbacks: PrismaAxisFeedbackRow[];
};

function toDomainFeedback(row: PrismaFeedbackRow): Feedback {
  return {
    id: row.id,
    overallComment: row.overallComment,
    sessionId: row.sessionId,
    axisFeedbacks: row.axisFeedbacks.map((e) => ({
      id: e.id,
      axis: AXIS_TO_DOMAIN[e.axis],
      comment: e.comment,
    })),
  };
}

/**
 * IFeedbackRepository の Prisma 実装。
 * ドメイン層が定義したインターフェースを Prisma で実装する（依存性逆転）。
 */
export class PrismaFeedbackRepository implements IFeedbackRepository {
  async findBySessionId(sessionId: string): Promise<Feedback | null> {
    const row = await prisma.feedback.findUnique({
      where: { sessionId },
      include: { axisFeedbacks: true },
    });
    return row === null ? null : toDomainFeedback(row);
  }

  async save(feedback: NewFeedback): Promise<Feedback> {
    try {
      const row = await prisma.feedback.create({
        data: {
          overallComment: feedback.overallComment,
          sessionId: feedback.sessionId,
          axisFeedbacks: {
            create: feedback.axisFeedbacks.map((e) => ({
              axis: AXIS_TO_PRISMA[e.axis],
              comment: e.comment,
            })),
          },
        },
        include: { axisFeedbacks: true },
      });
      return toDomainFeedback(row);
    } catch (error) {
      // 一意制約違反（sessionId @unique）= 並行実行で別の生成が先に成功した状態。
      // Prisma 固有エラーはここ（インフラ層）でドメインエラーへ翻訳する。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new FeedbackAlreadyExistsError(feedback.sessionId);
      }
      throw error;
    }
  }
}
