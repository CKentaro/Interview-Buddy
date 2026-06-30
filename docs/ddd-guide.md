## Interview Buddy 開発標準ガイド（DDDベース）

> **更新日**: 2026-06-26
> **ドキュメントバージョン**: v1.1.0（ドメイン層を model/services/ports のサブフォルダ構成に変更）

このドキュメントは、Interview Buddy プロジェクトの開発標準をチーム全員で統一するためのガイドです。DDD（ドメイン駆動設計：ビジネスの関心ごとを中心にソフトウェアを設計する考え方）をベースに、ディレクトリ構成・命名規則・実装ルールをまとめています。Web開発が初めてのメンバーでも迷わず実装できることを目指しています。

---

## ディレクトリ構成

プロジェクトのソースコードは `src/` 配下に置き、役割ごとに4つの層（レイヤー）へ分けて配置します。下図は各ディレクトリの役割を1行で示したものです。

```text
src/
├── app/                        # プレゼンテーション層：画面とAPIの入り口（Next.jsのルーティング）
│   ├── api/                    # APIエンドポイント（Route Handler）の置き場
│   │   ├── auth/               # 認証関連のAPI
│   │   ├── sessions/           # 面接セッション関連のAPI
│   │   ├── feedback/           # フィードバック関連のAPI
│   │   ├── users/              # ユーザー関連のAPI
│   │   └── types.ts            # APIのリクエスト/レスポンス型（DTO）の集約定義
│   └── (画面ページ)            # ユーザーが見る画面（ページコンポーネント）
├── components/                 # プレゼンテーション層：画面をまたいで使うReactコンポーネント
│   ├── auth/                   # 認証まわりのUI（例: SignOutButton）
│   ├── providers/              # Context Provider など（例: SessionProviderWrapper）
│   └── ui/                     # 汎用UIパーツ
├── domain/                     # ドメイン層：ビジネスの中心的なルールとデータ構造
│   ├── interview/              # 「面接」に関するドメイン（コンテキスト内を役割で分ける）
│   │   ├── model/             # エンティティ・値オブジェクト・enum
│   │   │   ├── InterviewSession.ts # 面接セッションのエンティティ（中心となるデータと振る舞い）
│   │   │   ├── Question.ts    # 質問のエンティティ
│   │   │   ├── Answer.ts      # 回答のエンティティ
│   │   │   └── EvaluationAxis.ts # 評価軸（ドメイン独自 enum）
│   │   ├── services/         # ドメインサービス（純粋なビジネスロジック）
│   │   │   ├── decideNextStep.ts     # 回答後の分岐判定（+ .test.ts）
│   │   │   └── selectMainQuestions.ts # 本質問5問の抽選（+ .test.ts）
│   │   └── ports/            # 契約（インターフェース。実装はインフラ層）
│   │       ├── IInterviewSessionRepository.ts # セッション永続化の契約
│   │       └── IFollowUpQuestionService.ts    # 深掘り質問生成の契約
│   └── feedback/               # 「フィードバック」に関するドメイン（同じく model/services/ports）
│       ├── model/
│       │   ├── Feedback.ts    # フィードバックのエンティティ
│       │   └── AxisEvaluation.ts # 評価軸ごとの評価エンティティ
│       └── ports/
│           └── IFeedbackRepository.ts # フィードバック永続化の契約
├── application/                # アプリケーション層：ユースケース（やりたいこと）を組み立てる
│   ├── interview/              # 面接に関するユースケース
│   │   ├── StartInterviewUseCase.ts        # 面接を開始する
│   │   ├── AnswerQuestionUseCase.ts        # 質問に回答する
│   │   └── DeleteInterviewSessionUseCase.ts # 面接履歴を削除する
│   └── feedback/               # フィードバックに関するユースケース
│       └── GenerateFeedbackUseCase.ts      # フィードバックを生成する
├── infrastructure/             # インフラ層：DBや外部API（技術的な詳細）の実装
│   ├── prisma/                 # Prisma（DBアクセスツール）を使ったリポジトリ実装
│   │   ├── PrismaInterviewSessionRepository.ts
│   │   └── PrismaFeedbackRepository.ts
│   ├── ai/                     # AI（Gemini）を使ったサービス実装
│   │   └── GeminiFeedbackService.ts
│   └── questionBank/           # 質問バンク（静的リソース）とその型・読み込み実装
│       ├── questionBank.json   # 質問バンクのデータ
│       └── questionBank.ts     # questionBank.json の生データ形状の型
├── lib/                        # 共通ユーティリティ：各層から使う共通の道具
│   ├── prisma.ts               # Prismaクライアントの初期化
│   └── auth-guard.ts           # 認証ガード（requireUser など）
├── auth.ts                     # 認証（Auth.js / NextAuth v5）の設定。v5慣習に従いsrc直下に置く
├── test/                       # テストのグローバル設定（テスト本体は実装と同階層にコロケーション）
│   └── setup.ts                # Vitestのセットアップ（vitest.config.ts から読み込む）
└── generated/                  # 自動生成ファイル（編集禁止）
    └── prisma/                 # Prismaが自動生成する型・クライアント
```

---

## 4層アーキテクチャの説明

Interview Buddy は「プレゼンテーション層」「アプリケーション層」「ドメイン層」「インフラ層」の4つに分けて設計します。それぞれの責務（やるべきこと）と依存関係（どの層を呼んでよいか）を以下にまとめます。

依存の方向は次のとおりです。**矢印は「呼んでよい向き」**を表します。

```text
プレゼンテーション → アプリケーション → ドメイン ← インフラ
```

ポイントは、**ドメイン層が中心**にあり、他の層に依存しないことです。インフラ層は「ドメイン層が定義したインターフェース」を実装する形でドメイン層に向かって依存します（これを依存性逆転と呼びます）。

### プレゼンテーション層（`app/`）

- **何をする層か**: ユーザーやHTTPリクエストの入り口です。画面の表示や、APIのリクエストを受け取ってレスポンスを返す役割を担います。
- **依存してよいもの**: アプリケーション層（UseCase）を呼び出してよい。
- **依存してはいけないもの**: ドメイン層の細かいルールを直接書いたり、インフラ層（Prisma等）を直接呼んだりしてはいけない。
- **具体例**: [src/app/api/sessions/route.ts](src/app/api/sessions/route.ts)（Route Handler）、各画面ページ。

### アプリケーション層（`application/`）

- **何をする層か**: 「面接を開始する」「質問に回答する」といったユースケース（アプリがやりたいことの単位）を組み立てる層です。ドメイン層のエンティティとインフラ層のリポジトリを呼び出して処理の流れを作ります。
- **依存してよいもの**: ドメイン層（エンティティ・リポジトリのインターフェース）。
- **依存してはいけないもの**: インフラ層の具体的な実装クラスを直接 new しない（インターフェース経由で受け取る）。Next.js固有の機能に依存しない。
- **具体例**: [src/application/interview/StartInterviewUseCase.ts](src/application/interview/StartInterviewUseCase.ts)。

### ドメイン層（`domain/`）

- **何をする層か**: ビジネスの中心となるルールとデータ構造（エンティティ）を表す層です。Interview Buddy の「面接とは何か」「フィードバックとは何か」という本質を表現します。
- **依存してよいもの**: 同じドメイン層の中だけ。原則として他のどの層・ライブラリにも依存しない。
- **依存してはいけないもの**: Prisma・Gemini・Next.js を import してはいけない（最重要ルール）。
- **コンテキスト内の分け方**: 各ドメイン（`interview/` 等）の中は、役割で 3 つのサブフォルダに分けます。
  - `model/`: エンティティ・値オブジェクト・enum（そのドメインの「データの形」）。
  - `services/`: ドメインサービス（複数のエンティティにまたがる純粋なビジネスロジック。例: `decideNextStep`）。
  - `ports/`: 契約（`I〜` インターフェース）。実装はインフラ層に置く（依存性逆転）。
- **具体例**: [src/domain/interview/model/Question.ts](src/domain/interview/model/Question.ts)、[src/domain/interview/services/decideNextStep.ts](src/domain/interview/services/decideNextStep.ts)、[src/domain/interview/ports/IInterviewSessionRepository.ts](src/domain/interview/ports/IInterviewSessionRepository.ts)。

### インフラ層（`infrastructure/`）

- **何をする層か**: DBや外部API（Gemini）など、技術的な詳細を実装する層です。ドメイン層が定義したリポジトリのインターフェースを、実際にPrismaやAPIを使って実装します。
- **依存してよいもの**: ドメイン層（実装すべきインターフェース）、外部ライブラリ（Prisma・Gemini SDK）。
- **依存してはいけないもの**: アプリケーション層・プレゼンテーション層を呼び出してはいけない（依存の向きが逆になるため）。
- **具体例**: [src/infrastructure/prisma/PrismaInterviewSessionRepository.ts](src/infrastructure/prisma/PrismaInterviewSessionRepository.ts)、[src/infrastructure/ai/GeminiFeedbackService.ts](src/infrastructure/ai/GeminiFeedbackService.ts)。

---

## 命名規則

ファイル名・クラス名の付け方を統一します。迷ったらこの表に従ってください。なお、PascalCase は「単語の先頭を大文字にしてつなげる書き方（例: InterviewSession）」を指します。

| 種類 | 命名パターン | 例 |
|------|------------|-----|
| エンティティ・値オブジェクト | PascalCase | InterviewSession, Question, SelectedQuestion |
| ドメインサービス | camelCase（関数名と一致） | decideNextStep, selectMainQuestions |
| リポジトリIF（インターフェース） | I + PascalCase + Repository | IInterviewSessionRepository |
| ポートIF（リポジトリ以外の契約） | I + PascalCase + Service / Provider | IFollowUpQuestionService, IQuestionBankProvider |
| リポジトリ実装 | Prisma + PascalCase + Repository | PrismaInterviewSessionRepository |
| ユースケース | PascalCase + UseCase | StartInterviewUseCase |
| Route Handler | route.ts（Next.js規約） | app/api/sessions/route.ts |
| AIサービス実装 | （技術名）+ PascalCase + Service | GeminiFollowUpQuestionService |
| enumの値 | SCREAMING_SNAKE_CASE | SessionStatus.IN_PROGRESS |

---

## 型方針

TypeScript の型の扱い方を統一します。型は「データの形を保証してバグを防ぐ仕組み」なので、ルールを守ることで安全に開発できます。

- `any` は原則禁止。やむを得ない場合は `unknown`（型が不明であることを明示する型）を使い、型ガードで絞り込む。
- Prismaの生成型（`generated/prisma/`）をドメイン層にimportしない（ドメイン層を技術的な詳細から守るため）。
- ドメイン層のエンティティは独自のクラスまたはinterfaceで定義する。
- APIのリクエスト/レスポンス型（DTO）は `app/api/types.ts` に集約する（プレゼンテーション層の関心ごとなので `app/api/` 内に置く）。
- enumはTypeScriptの `const enum` ではなく通常の `enum` を使用する（Prismaとの互換性のため）。
- 非同期処理は必ず `Promise` を明示する（戻り値の型に `Promise<...>` を書く）。

型ガードの例（`unknown` を安全に絞り込む書き方）:

```typescript
function isErrorWithMessage(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as Record<string, unknown>).message === "string"
  );
}
```

---

## 実装ルール（守るべきこと）

実装時に必ず守るルールです。これらを守ることで、層の責務が混ざらず、変更に強いコードになります。

- Route Handlerから直接Prismaを呼ばない（必ず Application層 → Infrastructure層 を経由する）。
- ドメイン層（`domain/`）に Prisma・Gemini・Next の import をしてはいけない。
- ユビキタス言語（後述の用語集）の用語をコード全体で統一する。
- 1つのUseCaseクラスには1つの `execute()` メソッドのみ定義する（1ユースケース＝1責務にするため）。
- リポジトリはinterfaceを必ず定義し、実装と分離する（ドメイン層にIF、インフラ層に実装）。

良い例（Route Handler は UseCase を呼ぶだけ）:

```typescript
// src/app/api/sessions/route.ts
export async function POST(request: Request): Promise<Response> {
  const useCase = new StartInterviewUseCase(repository);
  const result = await useCase.execute(/* 入力 */);
  return Response.json(result);
}
```

悪い例（Route Handler が直接Prismaを呼んでいる：禁止）:

```typescript
// ❌ これはやってはいけない
export async function POST(): Promise<Response> {
  const session = await prisma.interviewSession.create({ /* ... */ });
  return Response.json(session);
}
```

---

## ユビキタス言語（用語集）

ユビキタス言語とは「チーム・コード・仕様書のすべてで共通して使う言葉」のことです。下記の用語をコードの命名や会話で統一して使ってください。

| 用語 | 読み | 意味 |
|------|------|------|
| InterviewSession | インタビューセッション | 1回の面接練習全体 |
| Question | クエスチョン | AIが出す質問（MainQuestion / FollowUpQuestion の両方） |
| Answer | アンサー | ユーザーが回答した内容 |
| Feedback | フィードバック | Geminiが生成する評価レポート |
| AxisEvaluation | アクシスイバリュエーション | 4軸それぞれの評価コメント |
| MainQuestion | メインクエスチョン | セッションで出題される大問（5問固定） |
| FollowUpQuestion | フォローアップクエスチョン | 大問への深掘り質問（最大2回） |
| EvaluationAxis | イバリュエーションアクシス | 評価の4軸（再現性・価値観/判断軸・自己認識・世界観/知的好奇心） |

---

## ユースケースとAPIエンドポイントの対応表

各ユースケースが、どのUseCaseクラス・どのAPIエンドポイントに対応するかを一覧にしました。新しいAPIを作るときや、既存のAPIを探すときの索引として使ってください（`{id}` はセッションやユーザーのIDが入る部分を表します）。

| ユースケース | UseCase クラス | HTTPメソッド | エンドポイント |
|------------|--------------|------------|--------------|
| 面接練習を実施する | StartInterviewUseCase | POST | /api/sessions |
| 質問に回答する | AnswerQuestionUseCase | POST | /api/sessions/{id}/answers |
| フィードバックを生成する | GenerateFeedbackUseCase | POST | /api/sessions/{id}/feedback/generate |
| 面接練習履歴を閲覧する | GetInterviewHistoryUseCase | GET | /api/sessions |
| フィードバックを閲覧する | GetFeedbackUseCase | GET | /api/sessions/{id}/feedback |
| 面接履歴を削除する | DeleteInterviewSessionUseCase | DELETE | /api/sessions/{id} |
| ユーザ情報を閲覧する | GetUserUseCase | GET | /api/users/{id} |
| ユーザ情報を削除する | DeleteUserUseCase | DELETE | /api/users/{id} |
