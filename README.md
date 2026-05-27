# Interview Buddy

模擬面接AIエージェント。
IS17 クラス 6 班の卒業制作プロジェクトです。

---

## 技術スタック

| カテゴリ | 技術 | バージョン | 補足 |
| --- | --- | --- | --- |
| フレームワーク | [Next.js](https://nextjs.org/) | 16.2.6 | App Router / Turbopack |
| ライブラリ | [React](https://react.dev/) | 19.2.4 | |
| 言語 | [TypeScript](https://www.typescriptlang.org/) | 5.9.3 | `strict` + `noUncheckedIndexedAccess` |
| CSS | [Tailwind CSS](https://tailwindcss.com/) | 4.3.0 | CSS-first 設定 (`@theme` ディレクティブ) |
| DB | [PostgreSQL](https://www.postgresql.org/) | 17 (alpine) | ローカルは Docker、本番は AWS RDS 想定 |
| ORM | [Prisma](https://www.prisma.io/) | 7.8.0 | Rust-free な新クライアント (`prisma-client` generator) |
| DB GUI | Prisma Studio | (Prisma 同梱) | `pnpm db:studio` で起動 |
| ランタイム | [Node.js](https://nodejs.org/) | v24 (Active LTS) | `.nvmrc` で固定 |
| パッケージマネージャ | [pnpm](https://pnpm.io/) | v10 系 | |
| Lint | [ESLint](https://eslint.org/) | 9.39.4 | `eslint-config-next` 同梱 |
| コンテナ | [Docker](https://www.docker.com/) | 任意 (最新) | PostgreSQL の起動用 |
| `.env` ローダ (Prisma 用) | [dotenv](https://github.com/motdotla/dotenv) | 17.4.2 | `prisma.config.ts` から `.env.local` を読む |

### バージョン選定理由

- **Next.js 16**: Turbopack stable、React Compiler stable。新規プロジェクトに 15 を選ぶ理由がない。
- **PostgreSQL 17**: AWS RDS でサポート済み。本番との差異を最小化。
- **Prisma 7**: Rust-free クライアントで起動・ビルドが高速。`prisma.config.ts` の新形式に対応。
- **Tailwind CSS v4**: CSS-first 設定で `tailwind.config.ts` 不要。
- **Node.js v24**: 2026 年 5 月時点の Active LTS。

---

## 何もセットアップしていない PC で作業を始める手順

このプロジェクトを動かすのに **必要なツールのインストールから** 説明します。
すでに入っているものはスキップして OK です。

### 必要なツール

| ツール | バージョン | 用途 |
| --- | --- | --- |
| Git | 任意 | リポジトリのクローン |
| Node.js | **v24 (LTS)** | Next.js を実行するランタイム |
| pnpm | v10 系 | パッケージマネージャ |
| Docker Desktop | 任意 (最新) | PostgreSQL をコンテナで動かす |

---

## A. macOS の場合

### A-1. Homebrew をインストール (まだ無ければ)

ターミナルを開いて以下を実行:

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

インストール後、表示される `Next steps:` に従って PATH を通してください
(Apple Silicon Mac なら `eval "$(/opt/homebrew/bin/brew shellenv)"` を `~/.zprofile` に追加)。

### A-2. Git をインストール

```sh
brew install git
git --version    # 確認
```

### A-3. Node.js v24 を nvm 経由で入れる

Node はバージョン管理ツール **nvm** 経由で入れることを強く推奨します
(プロジェクトごとに `.nvmrc` でバージョンを切り替えるため)。

```sh
brew install nvm
mkdir -p ~/.nvm
```

`~/.zshrc` (bash の人は `~/.bashrc`) に以下を追記:

```sh
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
```

ターミナルを開き直してから:

```sh
nvm install 24       # Node v24 をインストール
nvm alias default 24 # デフォルトを v24 に
node --version       # v24.x.x が表示されれば OK
```

### A-4. pnpm をインストール

```sh
npm install -g pnpm
pnpm --version       # 10.x.x が表示されれば OK
```

### A-5. Docker Desktop をインストール

[公式サイト](https://www.docker.com/products/docker-desktop/) から `.dmg` をダウンロードしてインストール。

アプリを起動して、メニューバーにクジラのアイコンが出れば OK。

```sh
docker --version     # バージョン確認
docker info          # daemon が起動していれば情報が表示される
```

---

## B. Windows の場合

### B-1. Git for Windows をインストール

[Git for Windows](https://gitforwindows.org/) からインストーラーをダウンロードして実行。
インストール時の選択肢はすべてデフォルトのままで OK。

インストール後、**Git Bash** を開いて以下を確認:

```sh
git --version
```

> 以降のコマンドは **Git Bash** または **PowerShell** で実行してください。

### B-2. Node.js v24 を nvm-windows 経由で入れる

[nvm-windows](https://github.com/coreybutler/nvm-windows/releases) の最新リリースから
`nvm-setup.exe` をダウンロードして実行。

インストール後、PowerShell を **管理者権限で** 開いて:

```powershell
nvm install 24
nvm use 24
node --version       # v24.x.x が表示されれば OK
```

### B-3. pnpm をインストール

```powershell
npm install -g pnpm
pnpm --version       # 10.x.x が表示されれば OK
```

### B-4. Docker Desktop をインストール

[公式サイト](https://www.docker.com/products/docker-desktop/) から Windows 版インストーラーをダウンロードして実行。

WSL 2 のセットアップを求められた場合は指示に従ってください
(初回は再起動が必要なことがあります)。

インストール後、Docker Desktop を起動してタスクトレイにクジラのアイコンが出れば OK。

```powershell
docker --version
docker info
```

---

## C. プロジェクトのセットアップ (macOS / Windows 共通)

### C-1. リポジトリをクローン

```sh
git clone <repo-url> interview-buddy
cd interview-buddy
```

### C-2. Node のバージョンを `.nvmrc` に合わせる

```sh
nvm use              # .nvmrc を読み込んで v24 に切り替え
```

> エラーになる場合は `nvm install` を先に実行してください。

### C-3. 環境変数ファイルを用意

```sh
cp .env.example .env.local
```

中身は dev 用のダミー値が入っているので、そのままで動きます (本番では絶対変更)。

### C-4. 依存パッケージをインストール

```sh
pnpm install
```

> インストール後に `prisma generate` が自動で走り、`src/generated/prisma/` に
> Prisma Client が生成されます。

### C-5. PostgreSQL を起動

**事前に Docker Desktop を起動しておくこと。**

```sh
pnpm db:up
```

`interview-buddy-postgres` というコンテナが立ち上がります。

### C-6. マイグレーションを実行

```sh
pnpm db:migrate
```

現時点ではまだドメインモデルが定義されていないため `Already in sync, no schema change or pending migration was found.`
と表示されれば成功です。今後 `prisma/schema.prisma` にモデルを追加していくと、ここでマイグレーションが
作成・適用されるようになります。

### C-7. 開発サーバーを起動

```sh
pnpm dev
```

ターミナルに `Ready in ...ms` と出たら、ブラウザで http://localhost:3000 を開く。
「Interview Buddy」のランディングページとボタンが表示されたら **セットアップ完了** 🎉

---

## 主要な npm スクリプト

| コマンド | 説明 |
| --- | --- |
| `pnpm dev` | Next.js 開発サーバーを起動 (Turbopack) |
| `pnpm build` | プロダクションビルドを作成 |
| `pnpm start` | プロダクションサーバーを起動 |
| `pnpm lint` | ESLint を実行 |
| `pnpm db:up` | PostgreSQL コンテナを起動 |
| `pnpm db:down` | PostgreSQL コンテナを停止 |
| `pnpm db:reset` | コンテナとボリュームを破棄して再作成 (データ消去注意) |
| `pnpm db:migrate` | Prisma マイグレーションを開発モードで実行 |
| `pnpm db:studio` | Prisma Studio (GUI) を起動 |

---

## トラブルシューティング

### `pnpm db:up` で `port is already allocated` と出る

ホストの 5432 を別のプロセスが使っています。

- ローカル PostgreSQL を停止: `brew services stop postgresql` (macOS)
- 別の Docker コンテナを停止: `docker ps` で確認して `docker stop <container_name>`
- もしくは `docker-compose.yml` の `ports` を `"5433:5432"` などに変更し、
  `.env.local` の `DATABASE_URL` のポート部分も合わせて変更

### `pnpm db:up` で `Cannot connect to the Docker daemon` と出る

Docker Desktop が起動していません。アプリを起動してから再実行してください。

### `pnpm install` でエラー / Node バージョンが合わない

```sh
node --version  # v24.x.x を確認
nvm use         # .nvmrc を読み込んで切り替え
```

### `nvm: command not found` と出る (macOS)

`~/.zshrc` への追記がまだか、ターミナルを開き直していない可能性。
A-3 の `~/.zshrc` への追記をやり直し、ターミナルを再起動してください。

### Prisma Client が古い・型が合わない

```sh
pnpm prisma generate
```

### DB を一度まっさらにしたい

```sh
pnpm db:reset       # コンテナとボリュームを破棄
pnpm db:migrate     # 再マイグレーション
```
