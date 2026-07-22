/**
 * 深掘り質問プロンプトのプレイグラウンド。
 *
 * ブラウザ・DB・ログインを介さず、GeminiFollowUpQuestionService を直接叩いて
 * 各軸の深掘り質問の生成結果を一括で見比べるための開発用スクリプト。
 *
 * 使い方:
 *   npm run followup                 # 全軸・全ケース
 *   npm run followup -- REPRODUCIBILITY   # 軸で絞り込み（enum 値の前方一致）
 *
 * 必要な env: GOOGLE_GENERATIVE_AI_API_KEY（package.json の script で .env.local を読み込む）
 */
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import type { InterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import type { FollowUpGenerationContext } from "@/domain/interview/ports/IFollowUpQuestionService";
import { GeminiFollowUpQuestionService } from "@/infrastructure/ai/GeminiFollowUpQuestionService";

type PlaygroundCase = {
  /** ケースの狙い（曖昧回答 / 具体回答 など）。 */
  label: string;
  parentMainQuestionText: string;
  /** 直前の応募者の回答（会話履歴の末尾になる）。 */
  answerText: string;
  axis: EvaluationAxis;
  interviewerType?: InterviewerType;
};

/**
 * 各軸 × 「曖昧な回答 / 具体的な回答」の代表ケース。
 * 質問文は questionBank.json の実問を使用。
 */
const CASES: PlaygroundCase[] = [
  // 再現性（最重要）
  {
    axis: EvaluationAxis.REPRODUCIBILITY,
    label: "曖昧（主語がチーム）",
    parentMainQuestionText: "これまでで一番誇りに思う成果や、達成したことは何ですか。",
    answerText:
      "大学のゼミでチームとして研究発表会で最優秀賞を取れたことです。みんなで頑張った結果だと思っています。",
  },
  {
    axis: EvaluationAxis.REPRODUCIBILITY,
    label: "具体的（個人の行動あり）",
    parentMainQuestionText: "自分が設定した目標を達成するために、具体的にどんな行動をとりましたか。",
    answerText:
      "アルバイト先の売上を伸ばす目標を立て、まず客層を時間帯ごとに分析して、夕方の主婦層向けに総菜の品揃えを変える提案をしました。結果、月の売上が前年比115%になりました。",
  },

  // 自己認識
  {
    axis: EvaluationAxis.SELF_AWARENESS,
    label: "曖昧（抽象的な自己像）",
    parentMainQuestionText: "あなたの長所、または短所を教えてください。",
    answerText: "長所は真面目なところで、短所は完璧主義なところだと思います。",
  },
  {
    axis: EvaluationAxis.SELF_AWARENESS,
    label: "他者評価タイプ",
    parentMainQuestionText: "あなたは周りから見て、どのような人だと言われることが多いですか。",
    answerText: "周りからは、よく『冷静だね』と言われることが多いです。",
  },

  // 価値観 / 判断
  {
    axis: EvaluationAxis.VALUES_JUDGMENT,
    label: "決断タイプ",
    parentMainQuestionText: "何かを決断するとき、何を大切にしていますか。",
    answerText: "後悔しないかどうかを大切にしています。迷ったら挑戦する方を選びます。",
  },
  {
    axis: EvaluationAxis.VALUES_JUDGMENT,
    label: "好み・相性タイプ",
    parentMainQuestionText: "あなたが働きやすいと感じる人と、苦手だと感じる人はどんな人ですか。",
    answerText:
      "率直に意見を言ってくれる人が働きやすいです。逆に、思っていることを言わない人は少し苦手です。",
  },

  // 世界観 / 知的好奇心
  {
    axis: EvaluationAxis.WORLDVIEW,
    label: "世界観寄り",
    parentMainQuestionText: "10年後の社会はどう変わっていると思いますか。",
    answerText:
      "AIが普及して、多くの仕事が自動化されていると思います。人間はより創造的な仕事に集中するようになると考えています。",
  },
  {
    axis: EvaluationAxis.WORLDVIEW,
    label: "好奇心寄り",
    parentMainQuestionText: "最近読んだ本や、影響を受けたコンテンツを教えてください。",
    answerText: "最近『ファクトフルネス』を読みました。世界の見方が変わって面白かったです。",
  },
];

function buildContext(c: PlaygroundCase): FollowUpGenerationContext {
  return {
    axis: c.axis,
    parentMainQuestionText: c.parentMainQuestionText,
    interviewerType: c.interviewerType ?? "neutral",
    conversationHistory: [
      {
        questionId: "playground",
        questionText: c.parentMainQuestionText,
        answerText: c.answerText,
      },
    ],
  };
}

async function main(): Promise<void> {
  const filter = process.argv[2]?.toUpperCase();
  const cases = filter
    ? CASES.filter((c) => c.axis.startsWith(filter))
    : CASES;

  if (cases.length === 0) {
    console.error(
      `一致するケースがありません: "${filter}"\n有効な軸: ${Object.values(EvaluationAxis).join(", ")}`,
    );
    process.exit(1);
  }

  const service = new GeminiFollowUpQuestionService();

  for (const c of cases) {
    const context = buildContext(c);
    process.stdout.write(`\n=== ${c.axis} / ${c.label} ===\n`);
    process.stdout.write(`本質問: ${c.parentMainQuestionText}\n`);
    process.stdout.write(`回答  : ${c.answerText}\n`);
    try {
      const result = await service.generate(context);
      process.stdout.write(`深掘り: ${result.displayText}\n`);
      if (result.speechText) {
        process.stdout.write(`読上げ: ${result.speechText}\n`);
      }
    } catch (error) {
      process.stdout.write(
        `【生成失敗】${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
