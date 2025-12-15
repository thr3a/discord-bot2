この Discord ボットは、ユーザーが指定したシチュエーションに基づいて、AI とロールプレイを行うためのシステムです。
Firestore を使用して会話履歴と状態を永続化し、ローカルのOpenAI互換LLM と連携して応答を生成します。
主な機能は、シチュエーションの登録・表示・削除、会話の再生成、プロンプトの自動生成などです。

# 必ず守ること

- ユーザーは日本人です。思考や途中経過は英語で、コード内のコメントと最終出力、質問は日本語でお願いします。
- 既存のコードコメントは指示がない限り変えないこと
- npm run buildは行わない
- 指示されるまではAIのモデル名(gpt-4oなど)は勝手に変更しないこと
- 型定義はinterfaceではなくtypeを使用してください。
- any型は絶対に使用しないでください。
- 仕様変更があればAGENTS.mdの仕様書に追記すること
- firebaseのテストはFirebase Emulatorを使うこと(javaインストール済み) Discord 実装とは独立してテストする。npm run firebase-emuで起動中
- asを使った型アサーションは原則使用しないください。やむを得ず使用する場合はコードコメントを書いてください。
- classは絶対に使用しないでください。
- 関数はアロー関数を使用してください。
- 早期リターンを使って条件分岐をフラット化してください。
- try catch の使用は最低限に留め過度な使用を避けてください。
- モジュールのインポートには、Subpath Imports（#プレフィックス）を使用すること。 `例: import { roleplayModel } from '#config/openai.js';` 相対パス (Relative Paths) 、従来の Path Alias (@) は禁止

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
- `scenario_preview`: `/init` で生成したシチュエーションを仮保存し、ボットが送ったプレビューへの 🆗 リアクションを待っている状態。

# スラッシュコマンド

## /init

- オプション `characters` (必須, 1〜3) でAIキャラクターの人数を指定。
- コマンド実行時にチャンネル状態を `situation_input` へ遷移し、実行ユーザーのみが次のメッセージでシチュエーションを入力できる。
- 入力されたテキストは LLM（generateObject）で `世界観/シーン/人間の設定/キャラクター設定(人数分)/目標/終了条件/トーン/関係性` を含む構造体へ拡張し、結果をテキストファイルへ整形して Discord に添付・案内メッセージで返信する（/show と同形式）。
- 生成結果は即時に本登録せず、`channels/{channelId}.pendingScenario` へ仮保存し、チャンネル状態を `scenario_preview`（`requestedBy`, `personaCount`, `previewMessageId` を保持）へ遷移する。
- プレビュー投稿時にボットが先に 🆗 リアクションを付与し、ユーザーは同リアクションをクリックするだけで確定できる。
- ボットのプレビュー投稿に `/init` 実行ユーザーが 🆗 リアクションを付けるとシチュエーションを本登録し、会話履歴をクリアして `channels/{channelId}.scenario` へ反映する。完了時は「シチュエーションを登録しました。ロールプレイを開始できます。」と返信し、状態を `idle` へ戻す。
- プレビュー中に別メッセージが送られても既存シチュエーションでロールプレイを継続し、🆗 リアクションによる確定までは仮登録のままとする。

## /time

- 現在の日本時間（Asia/Tokyo）を表示。
- 例: `現在時刻: 2025/12/14 00:50:33`

## /debug

- 次に AI に送信するメッセージ一覧を表示（システムプロンプト + 履歴）。
- 各メッセージは「- role: 先頭20文字（超過時は…）」の形式で整形。

## /aimode

- AI と会話するモードを切り替える。
- `all` を指定すると全員が順番に回答する。キャラクター名/ID（例: `つんちゃん` or `tsun`）を指定すると単独モードに切り替わる。
- 応答はエフェメラル。

## /show

- 現在登録されている全キャラクター分のシステムプロンプトを、AI に送信する文字列そのままで表示（`buildSystemPrompt`の結果を連結）。
- Discord には常にテキストファイルを添付して送信し、本文は案内メッセージのみとする（Discord の 2000 文字制限に対応するため）。
- シチュエーションが設定されていない場合、「現在登録されているシチュエーションはありません。/init で登録できます。」と返信。

### /clear

- 該当のチャンネルの会話履歴をすべて削除。
- 「過去の会話を削除しました。」と返信。

# ロールプレイ仕様

- 対応チャンネルは `1005750360301912210` と `1269204261372166214` のみ。該当チャンネル以外では応答しないこと。
- システムプロンプトは Firestore の `channels/{channelId}.scenario` に保存された構造体（Zod定義）を使用し、
`worldSetting.location/time/situation`、`humanCharacter`、各キャラクターごとの `relationship/gender/age/firstPerson/secondPerson/personality/outfit/background` を結合して生成する。
`/aimode target=all` の場合はどちらが先に話すかをランダムで決め、もう一方も同じ履歴を引き継いで必ず返答する（履歴は ユーザー→AI1→AI2 で3件増える）。
`/aimode` で個別指定されている間は該当キャラクターのみ応答する。
- 応答生成には AI SDK の `generateObject` を使用し、スキーマは `line` と `currentOutfit` の2項目。Discordには `line` のみ送信し、キャラクター名をメッセージ先頭に付与する。
- モデルは `createOpenAI({ baseURL: 'http://deep02.local:8000/v1', apiKey: 'sk-dummy' })` で生成したクライアントの `main` を利用する。
- 各チャンネルごとに会話履歴とキャラクター別の服装情報を分離して保持し、チャンネル単位で直列処理する。

# Firestore永続化

- 会話履歴は Firestore の `channels/{channelId}/messages` サブコレクションに `role`, `content`, `personaId`, `createdAt` で保存する。`personaId` でどのAIが話したか必ず記録する。
- 各チャンネルのシナリオは `channels/{channelId}.scenario` に Zod 準拠の構造体として保存する（`worldSetting{ location, time, situation }`, `humanCharacter`, `personas[]` ※ `personas[].relationship` で人間との関係性を保持）。今後のカスタマイズに備え、常に最新構造を維持する。
- シチュエーションの仮保存は `channels/{channelId}.pendingScenario` に `{ scenario, requestedBy, previewMessageId, createdAt }` として保持し、🆗 リアクションで本登録後に削除する。
- キャラクターごとの最新の服装は `channels/{channelId}.personaStates.{personaId}.currentOutfit` にのみ保持し、上書き管理する。
- 現在の会話モードは `channels/{channelId}.responseMode` に `{ type: 'all' }` または `{ type: 'single', personaId }` で保存し、`/aimode` で切り替える。
- チャンネル状態は `channels/{channelId}.state` に `{ type: 'idle' }`, `{ type: 'situation_input', personaCount, requestedBy }`, `{ type: 'prompt_situation_input', personaCount, requestedBy }`, `{ type: 'scenario_preview', personaCount, requestedBy, previewMessageId }`, `{ type: 'awaiting_reinput' }` のいずれかで保存する。
- ボット起動時は Firestore から最新20件を読み込んで状態を復元し、以降も毎メッセージで同期する。
- Firebase Emulator (デフォルト: `localhost:6066`) を使ってチャットまわりのテストを実施できる構成とし、本番実装と切り離す。
