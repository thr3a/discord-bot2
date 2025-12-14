import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const openaiCompatible = createOpenAICompatible({
  name: 'openai-legacy',
  baseURL: 'http://deep02.local:8000/v1',
  apiKey: 'sk-dummy',
  supportsStructuredOutputs: true
});
export const roleplayModel = openaiCompatible('gpt-4o-mini');
