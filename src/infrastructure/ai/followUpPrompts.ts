import type { FollowUpGenerationContext } from "@/domain/interview/ports/IFollowUpQuestionService";
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import { EVALUATION_AXIS_METADATA } from "@/domain/interview/model/evaluationAxisMetadata";
import { getInterviewerPromptInstruction } from "./interviewerPromptInstructions";

/**
 * 深掘り質問生成のプロンプト定義。
 *
 * NOTE: 実際の面接で使われる深掘りの「角度」を型として定義し、評価軸ごとに
 * 有効な角度を優先順で対応付ける。毎回「具体的には？」に偏らないよう、
 * 直前の深掘りと同じ角度の再利用は禁止する。
 * 軸ラベル・説明は {@link EVALUATION_AXIS_METADATA}（単一の真実源）を参照する。
 */

/** 深掘りの角度（面接で使われる質問の型）。 */
type ProbingAngle = {
  /** プロンプト・ログで使う日本語名。 */
  name: string;
  /** どんな質問か（例文つき）。 */
  description: string;
};

const PROBING_ANGLES = {
  concretize: {
    name: "具体化・詳細化",
    description: "「具体的にはどんな場面で？」と事実や状況の解像度を上げる",
  },
  motive: {
    name: "動機・理由",
    description:
      "「なぜそう判断したのですか？」「そもそもなぜそれをやろうと思ったのですか？」と行動の理由を掘る",
  },
  alternatives: {
    name: "代替案・比較",
    description:
      "「他に選択肢はありましたか？なぜそれを選ばなかったのですか？」と選ばなかった道と比較させる",
  },
  obstacles: {
    name: "障害・葛藤",
    description: "「途中で一番苦労した・迷ったのはどこですか？」と困難への向き合い方を掘る",
  },
  counterfactual: {
    name: "反実仮想",
    description:
      "「もしそれをやらなかったら、どうなっていたと思いますか？」と仮定で思考の深さを試す",
  },
  quantify: {
    name: "定量化",
    description: "「それはどれくらいの規模・期間・影響でしたか？」と数字で確かめる",
  },
  othersView: {
    name: "他者視点",
    description:
      "「周りの人はどう反応しましたか？」「他者からはどう見られていると思いますか？」と第三者の目線を入れる",
  },
  learning: {
    name: "学び・再現性",
    description:
      "「そこから得た教訓を、他の場面でも活かした経験はありますか？」と学びの応用を確かめる",
  },
  emotionValues: {
    name: "感情・価値観",
    description:
      "「そのとき何に一番心が動きましたか？なぜそこにこだわったのですか？」と感情や価値観の源泉を掘る",
  },
} as const satisfies Record<string, ProbingAngle>;

type ProbingAngleKey = keyof typeof PROBING_ANGLES;

/**
 * 評価軸ごとに優先する深掘りの角度（優先順）。
 * 各軸の「確認したいこと」（EVALUATION_AXIS_METADATA の description）を
 * 最も直接あぶり出せる角度から並べる。
 */
export const AXIS_PROBING_ANGLES: Record<
  EvaluationAxis,
  readonly ProbingAngleKey[]
> = {
  // 客観性の検証が核心 → 他者からの見え方、エピソードの実在、弱みが出た場面。
  [EvaluationAxis.SELF_AWARENESS]: ["othersView", "concretize", "obstacles"],
  // 判断基準のあぶり出しが核心 → 選ばなかった道、選んだ理由、基準の一貫性の検証。
  [EvaluationAxis.VALUES_JUDGMENT]: ["alternatives", "motive", "counterfactual"],
  // 興味の源泉と独自性が核心 → なぜ惹かれたか、何に心が動いたか、実際の行動。
  [EvaluationAxis.WORLDVIEW]: ["motive", "emotionValues", "concretize"],
  // 学びの型化と応用が核心 → 教訓の応用経験、型・手順の中身、成果の実在。
  [EvaluationAxis.REPRODUCIBILITY]: ["learning", "concretize", "quantify"],
};

function formatAngleList(axis: EvaluationAxis): string {
  return AXIS_PROBING_ANGLES[axis]
    .map((key, index) => {
      const angle = PROBING_ANGLES[key];
      return `${index + 1}. ${angle.name}: ${angle.description}`;
    })
    .join("\n");
}

/** 深掘り質問生成のプロンプト。 */
export function buildFollowUpPrompt(context: FollowUpGenerationContext): string {
  const axis = EVALUATION_AXIS_METADATA[context.axis];
  const history = context.conversationHistory
    .map((pair) => `Q: ${pair.questionText}\nA: ${pair.answerText ?? "（未回答）"}`)
    .join("\n\n");

  return `あなたは就職面接の面接官です。
以下の評価軸に沿って、応募者への深掘り質問を1つ生成してください。

## 評価軸
- 軸名: ${axis.label}
- この軸で確認したいこと: ${axis.description}

## この軸で優先する深掘りの角度（優先順）
${formatAngleList(context.axis)}

## 本質問
${context.parentMainQuestionText}

## これまでのやり取り
${history}

## 面接官タイプ別の指示
${getInterviewerPromptInstruction(context.interviewerType)}

## 指示

### 深掘りの進め方
- まず、直前の回答に具体的なエピソード（いつ・どこで・誰と・何をしたか）が含まれているかを確認してください。
- エピソードがまだ出ていない場合は、角度リストより先に、発言を裏付ける実際のエピソードを1つ引き出す質問をしてください。他者視点・反実仮想・学びなどの角度は、具体的なエピソードが場に出て初めて自然に機能します。
- エピソードが既に出ている場合は、この軸で確認したいことのうち回答にまだ欠けている観点を特定し、上の角度リストからそれに最も合う角度を1つ選んで質問してください。
- これまでのやり取りに既に深掘り質問が含まれる場合、直前の深掘りと同じ角度は使わず、必ず別の角度から質問してください。

### 質問文の作り方
- 応募者の経験を尋ねるときは、「エピソードを教えてください」「具体例はありますか」のように回答の形式を要求する聞き方ではなく、その内容が実際に現れた場面・状況・行動を直接尋ねてください。質問文の中で「エピソード」「具体例」という言葉は使わないでください。
- 応募者の発言の中にある言葉をそのまま引用して質問を組み立ててください。応募者の言葉を要約・言い換えしてから質問しないでください。
- 「そのように」「その場面で」など、直前の発言を抽象的に指す指示語を質問の前提に使うことは禁止です。何を指しているかは応募者の言葉の引用で示してください。
- 応募者がまだ話していない場面・状況を、既に語られたかのように前提へ置かないでください。
- 質問は必ず1つだけにし、一文で簡潔に尋ねてください。
- displayText は画面表示用の端的な質問文にしてください。
- speechText は面接官として自然な会話口調の読み上げ文にしてください。`;
}
