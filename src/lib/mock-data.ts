/* ============================================================
 * Mock data for static UI phase.
 * Replace each export's implementation with API calls in phase 2.
 * ============================================================ */

export type MockSessionSummary = {
  id: number;
  date: string;
  dateLabel: string;
  rel: string;
  company: string;
  initial: string;
  role: string;
  type: string;
  interviewer: string;
  duration: string;
  questions: number;
  summary: string;
};

export type MockAxisEvaluation = {
  code: string;
  name: string;
  sub: string;
  tag: "priority" | "step" | "strength";
  tagLabel: string;
  body: string;
  nextTime: string[];
};

export type MockQAPair = {
  tag: string;
  question: string;
  answer: string;
  comment: string;
};

export type MockSessionDetail = MockSessionSummary & {
  interviewerLabel: string;
  overallComment: string;
  axes: MockAxisEvaluation[];
  qa: MockQAPair[];
};

export const MOCK_SESSIONS: MockSessionSummary[] = [
  {
    id: 9,
    date: "2026-05-19",
    dateLabel: "2026年5月19日（火）",
    rel: "昨日",
    company: "Boston Consulting Group",
    initial: "B",
    role: "コンサルタント / 新卒",
    type: "行動面接",
    interviewer: "ニュートラル",
    duration: "27分",
    questions: 8,
    summary: "判断軸の言語化に伸びしろが見えた回。",
  },
  {
    id: 8,
    date: "2026-05-15",
    dateLabel: "2026年5月15日（水）",
    rel: "5日前",
    company: "Mercari, Inc.",
    initial: "M",
    role: "プロダクトマネージャー / 中途",
    type: "総合面接",
    interviewer: "フレンドリー",
    duration: "22分",
    questions: 7,
    summary: "志望動機の解像度が一段上がった回。",
  },
  {
    id: 7,
    date: "2026-05-12",
    dateLabel: "2026年5月12日（日）",
    rel: "1週間前",
    company: "Boston Consulting Group",
    initial: "B",
    role: "コンサルタント / 新卒",
    type: "行動面接",
    interviewer: "厳しめ",
    duration: "31分",
    questions: 9,
    summary: "深掘りに対応する粒度調整が課題として残った回。",
  },
  {
    id: 6,
    date: "2026-05-08",
    dateLabel: "2026年5月8日（木）",
    rel: "11日前",
    company: "サイバーエージェント",
    initial: "C",
    role: "新規事業 / 新卒",
    type: "総合面接",
    interviewer: "ニュートラル",
    duration: "16分",
    questions: 6,
    summary: "関心領域の語りが自然に立ち上がった回。",
  },
  {
    id: 5,
    date: "2026-05-04",
    dateLabel: "2026年5月4日（日）",
    rel: "2週間前",
    company: "Boston Consulting Group",
    initial: "B",
    role: "コンサルタント / 新卒",
    type: "総合面接",
    interviewer: "ニュートラル",
    duration: "27分",
    questions: 8,
    summary: "経験の構造化は安定、価値観の言語化が次の宿題。",
  },
  {
    id: 4,
    date: "2026-04-27",
    dateLabel: "2026年4月27日（日）",
    rel: "3週間前",
    company: "SmartHR",
    initial: "S",
    role: "プロダクトマネージャー / 中途",
    type: "総合面接",
    interviewer: "フレンドリー",
    duration: "23分",
    questions: 7,
    summary: "自己認識の語り口が具体化してきた回。",
  },
  {
    id: 3,
    date: "2026-04-22",
    dateLabel: "2026年4月22日（火）",
    rel: "4週間前",
    company: "SmartHR",
    initial: "S",
    role: "プロダクトマネージャー / 中途",
    type: "技術面接",
    interviewer: "ニュートラル",
    duration: "19分",
    questions: 6,
    summary: "技術選定の判断軸の言語化に挑戦した回。",
  },
  {
    id: 2,
    date: "2026-04-18",
    dateLabel: "2026年4月18日（金）",
    rel: "1ヶ月前",
    company: "Goodpatch",
    initial: "G",
    role: "デザイナー / 新卒",
    type: "行動面接",
    interviewer: "ニュートラル",
    duration: "18分",
    questions: 6,
    summary: "制作プロセスを構造的に語れた回。",
  },
  {
    id: 1,
    date: "2026-04-12",
    dateLabel: "2026年4月12日（土）",
    rel: "1ヶ月前",
    company: "LayerX",
    initial: "L",
    role: "BizDev / 中途",
    type: "総合面接",
    interviewer: "厳しめ",
    duration: "25分",
    questions: 7,
    summary: "鋭い深掘りに対する初動が課題として残った回。",
  },
];

export const MOCK_SESSION_DETAIL: MockSessionDetail = {
  ...MOCK_SESSIONS[0]!,
  interviewerLabel: "ニュートラル · 田中部長",
  overallComment:
    "全体を通して、エピソードの構造を丁寧に開示しながら答えていた印象です。一方で、ご自身の判断軸や、なぜその選択をしたのかという内面の動きについては、もう少し具体に踏み込めると、面接官は「この人と一緒に働いてみたい」という確信を持ちやすかったように見えました。話を組み立てる骨格は十分あるので、次は「なぜそうしたか」を一言で言い切る練習を重ねると、ぐっと前に進めるはずです。",
  axes: [
    {
      code: "03",
      name: "自己認識",
      sub: "強み・弱みを適切な粒度で語れたか",
      tag: "priority",
      tagLabel: "伸びしろが大きい",
      body: "強みと弱みを語る場面で、抽象的な表現にとどまる瞬間がいくつかありました。例えば「コミュニケーションが得意」という言い方は、聞き手にとって解像度が上がりにくく、面接官側も深掘りの取っかかりを掴みづらくなります。具体的な行動と、それを支える価値観まで降りていけると、面接官の中に「こういう人だ」という像が結びやすくなります。",
      nextTime: [
        "強みは「行動 × 場面 × その人らしさ」の3点セットで語る",
        "弱みは『どう向き合っているか』を必ずセットにする",
      ],
    },
    {
      code: "02",
      name: "価値観・判断軸",
      sub: "自分の価値観を具体に言語化できたか",
      tag: "step",
      tagLabel: "もう一歩",
      body: "プロジェクトで難しい判断をした場面の語りには手応えがありました。ただ、判断の「軸」が一度ぼやけてしまう場面があり、聞き手が「この人はどんな価値観で動く人なのか」を一度では掴めない瞬間が混じります。",
      nextTime: [
        "「迷ったとき、何を優先したか」を一文で言い切る",
        "判断の軸は2回繰り返して印象を残す",
      ],
    },
    {
      code: "01",
      name: "再現性",
      sub: "思考プロセスを構造化して語れたか",
      tag: "strength",
      tagLabel: "強みとして表現できていた",
      body: "経験を語る際の構造はとても安定していました。状況 → 自分の判断 → 結果、という流れが自然に組み立てられており、面接官側が安心して聞ける時間が長かったです。",
      nextTime: ["深掘りされた時、結論を先に短く言い直す"],
    },
    {
      code: "04",
      name: "世界観・知的好奇心",
      sub: "自分の関心を面接の文脈で表現できたか",
      tag: "strength",
      tagLabel: "強みとして表現できていた",
      body: "関心領域について話す場面では、声のトーンが自然に変わり、聞き手にも興味の所在が伝わっていました。それを「仕事や役割にどう接続するか」を一言だけ添えられると、ただの趣味の話ではなく「この人の動機」として面接官の中に残ります。",
      nextTime: ["関心の話を、最後に『だから〇〇に惹かれている』で締める"],
    },
  ],
  qa: [
    {
      tag: "ウォームアップ",
      question: "はじめに、簡単に自己紹介をお願いします。",
      answer:
        "藤野ゆめと申します。〇〇大学の経済学部4年で、大学では地方自治体と連携したまちづくりプロジェクトを主導していました。20人規模のチームを率いて、地域住民・行政・企業の三者の利害を構造化し、半年で具体的な政策提言まで落とし込みました。",
      comment:
        "プロジェクトのスケールと立ち位置がすぐに把握できる、整った導入でした。ここで「だから自分は〇〇に関心がある」と一言添えると、その後の質問に自然に橋がかかります。",
    },
    {
      tag: "志望動機",
      question: "なぜ弊社を志望されているのか、お聞かせいただけますか？",
      answer:
        "戦略立案の現場で、複雑な状況を構造に落とし込むスキルを磨きたいからです。御社が長く取り組まれてきた公共・地域領域のプロジェクトに、自分の関心と接続できる可能性を感じています。",
      comment:
        "「他社でなく当社」の理由がやや一般化されていました。事例レベルまで降りるか、ご自身の経験との具体的な接続を加えると説得力が増します。",
    },
    {
      tag: "経験を聞く",
      question: "学生時代に、最も力を入れて取り組んだ経験を教えてください。",
      answer:
        "先ほど触れたまちづくりプロジェクトです。最初は住民の方々と行政の間に大きな温度差があり、議論が前に進まない状態でした。そこで…",
      comment:
        "状況設定が明確で、聞き手が情景を描きやすい語りでした。意思決定の順番をもう少しはっきりさせると、思考プロセスがより伝わります。",
    },
    {
      tag: "深掘り質問",
      question: "その経験の中で、最も難しかった判断は何でしたか？",
      answer:
        "住民代表の方と意見が対立した時に、行政側の提案を一旦引き取って住民側のヒアリングを優先したことです。納期は迫っていましたが、合意形成のためには必要だと判断しました。",
      comment:
        "判断の理由が一文に凝縮されていて伝わりました。一方で「自分の判断軸」がどこに置かれているかは、もう少し言語化できそうです。",
    },
    {
      tag: "価値観",
      question: "その判断軸は、今のあなたにも残っていますか？",
      answer: "残っていると思います。短期的な進捗より、信頼を積み上げることを優先しがちです。",
      comment:
        "「短期より信頼」という軸が出てきたのは良かった点です。これに具体的なエピソードを一つ重ねると、価値観として強く印象に残ります。",
    },
    {
      tag: "自己認識",
      question: "ご自身の強みと、まだ伸ばしたい部分を一つずつ教えてください。",
      answer: "強みはコミュニケーションだと思います。弱みは、考えすぎてしまうところです。",
      comment:
        "ここは伸びしろです。「コミュニケーション」「考えすぎる」は粒度が広く、聞き手の印象に残りづらい言葉。具体的な場面とセットで語る練習を。",
    },
    {
      tag: "知的好奇心",
      question: "最近、関心を持って深く調べたテーマはありますか？",
      answer:
        "都市計画における『歩いて楽しいまち』の評価指標について調べています。海外の事例と日本の差分を比較していて…",
      comment:
        "声のトーンが上がり、本当に好きなのが伝わりました。最後に『だからコンサルでもこの感覚を活かしたい』と接続できると一段強くなります。",
    },
    {
      tag: "逆質問",
      question: "最後に、弊社や私に対して質問はありますか？",
      answer:
        "御社で活躍されている方に共通する『判断の癖』のようなものがあれば、教えていただきたいです。",
      comment:
        "面接官の経験を引き出す良質な問いでした。志望度や関心の所在が、質問の角度から自然に伝わっています。",
    },
  ],
};

/* 4-week activity grid for profile (Sun-Sat, newest row = bottom) */
export const MOCK_ACTIVITY: number[][] = [
  [0, 0, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 1],
];
