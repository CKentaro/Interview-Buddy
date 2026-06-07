import { EvaluationAxis } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  generateAxisEvaluation,
  generateOverallComment,
  type AxisQAPair,
} from "@/lib/llm";

const ALL_AXES = [
  EvaluationAxis.REPRODUCIBILITY,
  EvaluationAxis.SELF_AWARENESS,
  EvaluationAxis.VALUES_JUDGMENT,
  EvaluationAxis.WORLDVIEW,
] as const;

type QuestionWithAnswer = {
  content: string;
  displayOrder: number;
  primaryAxis: EvaluationAxis | null;
  answer: { content: string } | null;
};

/**
 * 純粋関数: Question+Answer のリストを軸ごとにグルーピングする。
 * answer が null（未回答）の質問は除外する。
 */
export function groupQAByAxis(
  questions: QuestionWithAnswer[],
): Map<EvaluationAxis, AxisQAPair[]> {
  const map = new Map<EvaluationAxis, AxisQAPair[]>(
    ALL_AXES.map((axis) => [axis, []]),
  );

  for (const q of questions) {
    if (!q.answer || !q.primaryAxis) continue;
    map.get(q.primaryAxis)!.push({
      questionText: q.content,
      answerText: q.answer.content,
    });
  }

  return map;
}

/**
 * フィードバック生成の本体。
 * after() から呼ばれるため、失敗しても呼び出し元には伝搬しない。
 * 部分保存しない: Promise.all が reject すればトランザクションは実行しない。
 */
export async function runFeedbackGeneration(sessionId: string): Promise<void> {
  // 二重生成ガード（after() から複数回呼ばれた場合を含む）
  const existing = await prisma.feedback.findUnique({
    where: { sessionId },
  });
  if (existing) return;

  // 全 Question+Answer を収集（displayOrder 昇順）
  const questions = await prisma.question.findMany({
    where: { sessionId },
    include: { answer: true },
    orderBy: { displayOrder: "asc" },
  });

  const byAxis = groupQAByAxis(questions);

  // 全件リスト（overallComment 用）
  const allQaList: AxisQAPair[] = questions
    .filter((q) => q.answer !== null)
    .map((q) => ({
      questionText: q.content,
      answerText: q.answer!.content,
    }));

  // 5つを並行実行。1つでも失敗したら全体が reject → 何も保存しない
  const [reproducibility, selfAwareness, valuesJudgment, worldview, overall] =
    await Promise.all([
      generateAxisEvaluation(
        EvaluationAxis.REPRODUCIBILITY,
        byAxis.get(EvaluationAxis.REPRODUCIBILITY)!,
      ),
      generateAxisEvaluation(
        EvaluationAxis.SELF_AWARENESS,
        byAxis.get(EvaluationAxis.SELF_AWARENESS)!,
      ),
      generateAxisEvaluation(
        EvaluationAxis.VALUES_JUDGMENT,
        byAxis.get(EvaluationAxis.VALUES_JUDGMENT)!,
      ),
      generateAxisEvaluation(
        EvaluationAxis.WORLDVIEW,
        byAxis.get(EvaluationAxis.WORLDVIEW)!,
      ),
      generateOverallComment(allQaList),
    ]);

  // 全成功 → 1トランザクションで一括保存
  await prisma.$transaction(async (tx) => {
    const feedback = await tx.feedback.create({
      data: {
        overallComment: overall.overallComment,
        sessionId,
      },
    });

    await tx.axisEvaluation.createMany({
      data: [
        { axis: EvaluationAxis.REPRODUCIBILITY, comment: reproducibility.comment, feedbackId: feedback.id },
        { axis: EvaluationAxis.SELF_AWARENESS, comment: selfAwareness.comment, feedbackId: feedback.id },
        { axis: EvaluationAxis.VALUES_JUDGMENT, comment: valuesJudgment.comment, feedbackId: feedback.id },
        { axis: EvaluationAxis.WORLDVIEW, comment: worldview.comment, feedbackId: feedback.id },
      ],
    });
  });
}
