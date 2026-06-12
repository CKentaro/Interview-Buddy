# テーブル設計書

- DBMS: PostgreSQL
- ORM: Prisma（`prisma/schema.prisma` を正とする）
- 文字コード: UTF-8
- レコード長/ファイル量は **論理最大長** を基準とした目安値（PostgreSQL は可変長のため物理サイズは異なる）

## 凡例

- データ型は Prisma の型／PostgreSQL の型を併記
- バイト数の算出基準
  - `cuid()` ID: 25 byte
  - `String`（指定なし）: 255 byte 想定
  - `String @db.Text`（トークン等）: 4,000 byte 想定
  - 長文 `String`（content / comment 等）: 4,000 byte 想定
  - `DateTime`: 8 byte
  - `Int`: 4 byte
  - `enum`: 20 byte（ラベル文字列長）

---

## 1. テーブル一覧

| No. | テーブル名 | シンボル名 | レコード長 (byte) | 件数（最大） | ファイル量 (KB) | 文字コード |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | ユーザー | `User` | 2,591 | 1,000 | 2,530 | UTF-8 |
| 2 | OAuth アカウント | `Account` | 12,879 | 1,000 | 12,577 | UTF-8 |
| 3 | セッション | `Session` | 313 | 10,000 | 3,057 | UTF-8 |
| 4 | 認証トークン | `VerificationToken` | 518 | 100 | 51 | UTF-8 |
| 5 | 面接セッション | `InterviewSession` | 516 | 10,000 | 5,039 | UTF-8 |
| 6 | 質問 | `Question` | 4,113 | 100,000 | 401,855 | UTF-8 |
| 7 | 回答 | `Answer` | 4,050 | 100,000 | 395,508 | UTF-8 |
| 8 | フィードバック | `Feedback` | 4,050 | 10,000 | 39,551 | UTF-8 |
| 9 | 軸別評価 | `AxisEvaluation` | 4,070 | 40,000 | 158,985 | UTF-8 |

---

## 2. マスタ別レイアウト

### 2.1 User（ユーザー）

Auth.js (next-auth v5) 標準スキーマに準拠したユーザーマスタ。

| データ項目名 | シンボル名 | データ型 | バイト数 | 初期値 | Null可 | 主キー：一意制約 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ユーザーID | `id` | String (TEXT) | 25 | `cuid()` | × | PK | cuid 形式 |
| 氏名 | `name` | String? (TEXT) | 255 | NULL | ○ | - | Auth.js 仕様で optional |
| メールアドレス | `email` | String (TEXT) | 255 | - | × | UQ | 一意 |
| メール確認日時 | `emailVerified` | DateTime? | 8 | NULL | ○ | - | Auth.js: メール確認済日時 |
| プロフィール画像 URL | `image` | String? (TEXT) | 2,048 | NULL | ○ | - | OAuth プロバイダから取得 |

**リレーション**: `Account[]`, `Session[]`, `InterviewSession[]`

---

### 2.2 Account（OAuth アカウント）

Auth.js が OAuth プロバイダごとに発行する接続情報。User : Account = 1 : N。

| データ項目名 | シンボル名 | データ型 | バイト数 | 初期値 | Null可 | 主キー：一意制約 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| アカウントID | `id` | String (TEXT) | 25 | `cuid()` | × | PK | cuid 形式 |
| ユーザーID | `userId` | String (TEXT) | 25 | - | × | FK | `User.id` 参照 / `onDelete: Cascade` |
| アカウント種別 | `type` | String (TEXT) | 20 | - | × | - | `oauth` 等 |
| プロバイダ | `provider` | String (TEXT) | 20 | - | × | UQ1 | `google` 等 |
| プロバイダ側アカウントID | `providerAccountId` | String (TEXT) | 255 | - | × | UQ1 | Google OAuth では `sub` クレーム値 |
| リフレッシュトークン | `refresh_token` | String? (TEXT) | 4,000 | NULL | ○ | - | `@db.Text` |
| アクセストークン | `access_token` | String? (TEXT) | 4,000 | NULL | ○ | - | `@db.Text` |
| トークン有効期限 | `expires_at` | Int? | 4 | NULL | ○ | - | Unix epoch (秒) |
| トークン種別 | `token_type` | String? (TEXT) | 20 | NULL | ○ | - | `Bearer` 等 |
| スコープ | `scope` | String? (TEXT) | 255 | NULL | ○ | - | OAuth スコープ |
| ID トークン | `id_token` | String? (TEXT) | 4,000 | NULL | ○ | - | `@db.Text` / JWT |
| セッション状態 | `session_state` | String? (TEXT) | 255 | NULL | ○ | - | OIDC `session_state` |

**複合一意制約**: `UQ1 = (provider, providerAccountId)`
**リレーション**: `User`（多対一）

---

### 2.3 Session（セッション）

Auth.js のデータベースセッション。

| データ項目名 | シンボル名 | データ型 | バイト数 | 初期値 | Null可 | 主キー：一意制約 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| セッションID | `id` | String (TEXT) | 25 | `cuid()` | × | PK | cuid 形式 |
| セッショントークン | `sessionToken` | String (TEXT) | 255 | - | × | UQ | Cookie に格納される識別子 |
| ユーザーID | `userId` | String (TEXT) | 25 | - | × | FK | `User.id` 参照 / `onDelete: Cascade` |
| 有効期限 | `expires` | DateTime | 8 | - | × | - | セッション失効日時 |

**リレーション**: `User`（多対一）

---

### 2.4 VerificationToken（認証トークン）

Auth.js のメールリンク認証用トークン（マジックリンク）。

| データ項目名 | シンボル名 | データ型 | バイト数 | 初期値 | Null可 | 主キー：一意制約 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 識別子 | `identifier` | String (TEXT) | 255 | - | × | UQ1 | メールアドレス等 |
| トークン | `token` | String (TEXT) | 255 | - | × | UQ / UQ1 | 単独 UQ + 複合 UQ |
| 有効期限 | `expires` | DateTime | 8 | - | × | - | トークン失効日時 |

**複合一意制約**: `UQ1 = (identifier, token)`
**備考**: 主キー（単独 PK）は宣言されておらず、`token` の単独一意と `(identifier, token)` の複合一意で識別する。

---

### 2.5 InterviewSession（面接セッション）

1 回の模擬面接にあたるアプリ本体の主テーブル。

| データ項目名 | シンボル名 | データ型 | バイト数 | 初期値 | Null可 | 主キー：一意制約 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 面接セッションID | `id` | String (TEXT) | 25 | `cuid()` | × | PK | cuid 形式 |
| 開始日時 | `startedAt` | DateTime | 8 | `now()` | × | - | レコード作成時刻 |
| 終了日時 | `endedAt` | DateTime? | 8 | NULL | ○ | - | 面接完了時に設定 |
| 企業名 | `companyName` | String? (TEXT) | 100 | NULL | ○ | - | 任意入力 |
| 業界（大分類） | `industryMajor` | String? (TEXT) | 50 | NULL | ○ | - | 例: IT・通信 |
| 業界（小分類） | `industryMinor` | String? (TEXT) | 50 | NULL | ○ | - | 例: SaaS |
| 職種（大分類） | `jobMajor` | String? (TEXT) | 50 | NULL | ○ | - | 例: エンジニア |
| 職種（小分類） | `jobMinor` | String? (TEXT) | 50 | NULL | ○ | - | 例: バックエンド |
| 選考段階 | `selectionStage` | String? (TEXT) | 50 | NULL | ○ | - | 例: 一次面接 |
| 難易度 | `difficulty` | String? (TEXT) | 50 | NULL | ○ | - | 例: 標準 |
| 面接官タイプ | `interviewerType` | String? (TEXT) | 50 | NULL | ○ | - | 例: 圧迫 / 和やか |
| ユーザーID | `userId` | String (TEXT) | 25 | - | × | FK | `User.id` 参照 / `onDelete: Cascade` |

**リレーション**: `User`（多対一）, `Question[]`, `Feedback?`

---

### 2.6 Question（質問）

面接で出題された質問。本質問と深掘り質問を自己参照リレーションで保持。

| データ項目名 | シンボル名 | データ型 | バイト数 | 初期値 | Null可 | 主キー：一意制約 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 質問ID | `id` | String (TEXT) | 25 | `cuid()` | × | PK | cuid 形式 |
| 質問種別 | `type` | enum `QuestionType` | 20 | - | × | - | `MAIN` / `FOLLOW_UP` |
| 質問内容 | `content` | String (TEXT) | 4,000 | - | × | - | 生成質問文 |
| 表示順 | `displayOrder` | Int | 4 | - | × | - | セッション内の表示順 |
| 深掘り回数 | `depthCount` | Int | 4 | 0 | × | - | 親質問からの深掘り段数 |
| 主評価軸 | `primaryAxis` | enum `EvaluationAxis`? | 20 | NULL | ○ | - | 4 軸のいずれか |
| 面接セッションID | `sessionId` | String (TEXT) | 25 | - | × | FK | `InterviewSession.id` 参照 / `onDelete: Cascade` |
| 親質問ID | `parentQuestionId` | String? (TEXT) | 25 | NULL | ○ | FK | `Question.id` 自己参照 / `onDelete: Cascade` |

**リレーション**: `InterviewSession`（多対一）, `Question`（親、自己参照）, `Question[]`（子・深掘り）, `Answer?`

---

### 2.7 Answer（回答）

ユーザーが質問に対して行った回答。Question : Answer = 1 : 1。

| データ項目名 | シンボル名 | データ型 | バイト数 | 初期値 | Null可 | 主キー：一意制約 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 回答ID | `id` | String (TEXT) | 25 | `cuid()` | × | PK | cuid 形式 |
| 回答内容 | `content` | String (TEXT) | 4,000 | - | × | - | 音声書き起こし含む想定 |
| 質問ID | `questionId` | String (TEXT) | 25 | - | × | FK / UQ | `Question.id` 参照 / `onDelete: Cascade` |

**リレーション**: `Question`（一対一）

---

### 2.8 Feedback（フィードバック）

面接セッション全体への総評。InterviewSession : Feedback = 1 : 1。

| データ項目名 | シンボル名 | データ型 | バイト数 | 初期値 | Null可 | 主キー：一意制約 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| フィードバックID | `id` | String (TEXT) | 25 | `cuid()` | × | PK | cuid 形式 |
| 総評コメント | `overallComment` | String (TEXT) | 4,000 | - | × | - | LLM 生成の総評文 |
| 面接セッションID | `sessionId` | String (TEXT) | 25 | - | × | FK / UQ | `InterviewSession.id` 参照 / `onDelete: Cascade` |

**リレーション**: `InterviewSession`（一対一）, `AxisEvaluation[]`

---

### 2.9 AxisEvaluation（軸別評価）

4 つの評価軸ごとのコメント。Feedback : AxisEvaluation = 1 : N（通常 4 件）。

| データ項目名 | シンボル名 | データ型 | バイト数 | 初期値 | Null可 | 主キー：一意制約 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 軸別評価ID | `id` | String (TEXT) | 25 | `cuid()` | × | PK | cuid 形式 |
| 評価軸 | `axis` | enum `EvaluationAxis` | 20 | - | × | - | 再現性 / 価値観 / 自己認識 / 世界観 |
| 評価コメント | `comment` | String (TEXT) | 4,000 | - | × | - | 軸ごとの講評 |
| フィードバックID | `feedbackId` | String (TEXT) | 25 | - | × | FK | `Feedback.id` 参照 / `onDelete: Cascade` |

**リレーション**: `Feedback`（多対一）

---

## 3. ENUM 定義

### 3.1 EvaluationAxis（評価軸）

| 値 | 意味 |
| --- | --- |
| `REPRODUCIBILITY` | 再現性 |
| `VALUES_JUDGMENT` | 価値観 / 判断 |
| `SELF_AWARENESS` | 自己認識 |
| `WORLDVIEW` | 世界観 / 知的好奇心 |

### 3.2 QuestionType（質問種別）

| 値 | 意味 |
| --- | --- |
| `MAIN` | 本質問 |
| `FOLLOW_UP` | 深掘り質問 |

---

## 4. ER 概要

```
User 1─┬─N Account
       ├─N Session
       └─N InterviewSession 1─N Question 1─1 Answer
                            │            └─N Question (自己参照: 深掘り)
                            └─1 Feedback 1─N AxisEvaluation
```
