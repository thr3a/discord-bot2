```bash
node --import tsx --env-file .env --watch ./src/scripts/hello.ts
```

各チャンネルで投稿したら
システムプロンプト「優しいお姉さんで会話してください」(仮、今後シチュエーションの管理機能実装する)
でお姉さんとチャットできるようにして

ai sdk のgenerateText使うこと

const openai = createOpenAI({
  baseURL: 'http://deep02.local:8000/v1',
  apiKey: 'sk-dummy'
});


# データ構造（Firestore）
- `channelStates` コレクション：
  - 各ドキュメントはチャンネルIDをキー。
  - フィールド：`mode`（string）、`situation`（string）、`updatedAt`（timestamp）。
- `channelConversations/{channelId}/messages` コレクション：
  - 各ドキュメントは1つのメッセージ。
  - フィールド：`role`（string）、`content`（string）、`discordMessageId`（string, assistant用）、`discordUserMessageId`（string, user用）、`createdAt`（timestamp）。

discordとfirebaseの実装を排他的にすること！
firebaseはdiscordに依存しない実装とテストを実装してください(vitest 
それぞれでテスト
firebase emulators使うこと 

type": "service_account","project_id": "thr3a-misc-ai","private_key_id":

## テスト

Firestore エミュレータを使用するため `npm test` 実行時に Java (11 以上を推奨) が必要です。Java がインストールされていない環境ではテストが起動できません。
