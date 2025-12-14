この Discord ボットは、ユーザーが指定したシチュエーションに基づいて、AI とロールプレイを行うためのシステムです。
Firestore を使用して会話履歴と状態を永続化し、ローカルのOpenAI互換LLM と連携して応答を生成します。
主な機能は、シチュエーションの登録・表示・削除、会話の再生成、プロンプトの自動生成などです。

# 必ず守ること

- ユーザーは日本人です。思考や途中経過は英語で、コード内のコメントと最終出力、質問は日本語でお願いします。
- 既存のコードコメントは指示がない限り変えないこと
- npm run buildは行わない
- 指示されるまではAIのモデル名(gpt-4oなど)は勝手に変更しないこと
- 型定義はinterfaceではなくtypeを使用してください。
- any使用不可
- 仕様変更があればAGENTS.mdの仕様書に追記すること
- firebaseのテストはFirebase Emulatorを使うこと（javaインストール済み

# ライブラリ概要

- 言語: TypeScript
- lint: biome
- nodejs v22
- テストフレームワーク: vitest v4
- discord.js v14
- AI SDK by Vercel v5
- 日付ライブラリ: Day.js

.envのサンプル

```
DISCORD_BOT_TOKEN=****
DISCORD_CLIENT_ID=1234
DISCORD_GUILD_ID=1234
FIREBASE_SECRET_JSON='{"type": "service_account"...}'
```

=======================以下仕様書=======================

# チャンネル制御

- 許可されるチャンネルは、1005750360301912210(main1) ,1269204261372166214(main2)の２つ。今後チャンネルごとでシチュエーションが別々で管理される予定。今後も増える想定で。
- それ以外のチャンネルでは、ボットは反応しない。
- 各チャンネルでは排他的に動く。

# 状態管理

ボットは各チャンネルごとに以下の状態を管理する：
- `idle`: 通常の会話モード。ユーザーのメッセージに応答する。
- `situation_input`: シチュエーション入力待ちモード。ユーザーのメッセージをシチュエーションとして保存し、`idle` に遷移。
- `awaiting_reinput`: ユーザーのメッセージに ♻️ リアクションが付いた場合に遷移。ユーザーに再入力を促す。
- `prompt_situation_input`: `/prompt` コマンド実行後に遷移。ユーザーの入力に基づいてプロンプトを生成する。

# スラッシュコマンド

## /time

- 現在の日本時間（Asia/Tokyo）を表示。
- 例: `現在時刻: 2025/12/14 00:50:33`

# ロールプレイ仕様

- 対応チャンネルは `1005750360301912210` と `1269204261372166214` のみ。該当チャンネル以外では応答しないこと。
- 各チャンネルでは処理を直列化し、同時に複数メッセージを処理しない。
- システムプロンプトは `優しいお姉さんで会話してください` を常に使用する（シチュエーション管理導入までの暫定仕様）。

# Firestore データ構造

- `channelStates/{channelId}` ドキュメント
  - フィールド: `mode`, `situation`, `updatedAt`
  - `mode` は `idle` / `situation_input` / `awaiting_reinput` / `prompt_situation_input`
- `channelConversations/{channelId}/messages/{messageId}`
  - フィールド: `role`, `content`, `discordMessageId`, `discordUserMessageId`, `createdAt`
  - `role` は `user` か `assistant`
- Firestore emulator を用いたテストを追加済み。Discord 実装とは独立してテストする。

# AI 連携

- AI SDK (`generateText`) を使用し、`createOpenAI` で `baseURL: http://deep02.local:8000/v1`、`apiKey: sk-dummy` を設定する。
- モデル名は指示があるまで変更しない。
