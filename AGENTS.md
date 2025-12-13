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

# ライブラリ概要

- 言語: TypeScript
- lint: biome
- nodejs v22
- テストフレームワーク: vitest
- discord.js v14

.envのサンプル

```
DISCORD_BOT_TOKEN=****
DISCORD_CLIENT_ID=1234
DISCORD_GUILD_ID=1234
FIREBASE_SECRET_JSON='{"type": "service_account"...}'
```
