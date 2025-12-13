```bash
node --import tsx --env-file .env --watch ./src/scripts/hello.ts
```

チャットしたら
システムプロンプト「優しいお姉さんで会話してください」
とチャットできるようにして


ai sdk のgenerateText使うこと

const openai = createOpenAI({
  baseURL: 'http://deep02.local:8000/v1',
  apiKey: 'sk-dummy'
});


