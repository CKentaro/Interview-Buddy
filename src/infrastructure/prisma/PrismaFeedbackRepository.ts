import type { Feedback } from "@/domain/feedback/model/Feedback";
import type {
  IFeedbackRepository,
  NewFeedback,
} from "@/domain/feedback/ports/IFeedbackRepository";
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis";
import type { EvaluationAxis as PrismaEvaluationAxis } from "@/generated/prisma/enums";
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

type PrismaAxisEvaluationRow = {
  id: string;
  axis: PrismaEvaluationAxis;
  comment: string;
};

type PrismaFeedbackRow = {
  id: string;
  overallComment: string;
  sessionId: string;
  axisEvaluations: PrismaAxisEvaluationRow[];
};

function toDomainFeedback(row: PrismaFeedbackRow): Feedback {
  return {
    id: row.id,
    overallComment: row.overallComment,
    sessionId: row.sessionId,
    axisEvaluations: row.axisEvaluations.map((e) => ({
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
      include: { axisEvaluations: true },
    });
    return row === null ? null : toDomainFeedback(row);
  }

  async save(feedback: NewFeedback): Promise<Feedback> {
    const row = await prisma.feedback.create({
      data: {
        overallComment: feedback.overallComment,
        sessionId: feedback.sessionId,
        axisEvaluations: {
          create: feedback.axisEvaluations.map((e) => ({
            axis: AXIS_TO_PRISMA[e.axis],
            comment: e.comment,
          })),
        },
      },
      include: { axisEvaluations: true },
    });
    return toDomainFeedback(row);
  }
}
