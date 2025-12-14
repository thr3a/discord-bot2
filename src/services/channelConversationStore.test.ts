import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 20000 });

const ensureFirebaseEnv = (): void => {
  if (!process.env.FIREBASE_SECRET_JSON) {
    process.env.FIREBASE_SECRET_JSON = JSON.stringify({
      project_id: 'demo-test',
      private_key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDENmuKnXJKJfjG
45TnQxeNpG/LgOMWKBqRwyVkHg8KXVmiyMQJOHsgbBF86ZZDYQL3MvYKLmZrzEbO
h6faSfSXcJO6DmO34/6hnERH8MWeSEjFyh3ZaCtElfeBQJGx+Ya+eioczM8u9AnX
X6Ji6auR7xOSG5oLGPlMvuY6+//0dOF+xCHZ6imztCtSDVrs/wIoFswn0K1VIfSy
VMxUWYKucxZ/MGFlDdZtaM11qod91fstssh/esyG33FyNT/C2c3hClYY+1oK1VHG
iERyLE1ct6+2VEgm+02e1h/FAOXTQABjHCVIHNkVmQRj5bNmtBQGXSrVXY6SOM5R
LKjNbmtNAgMBAAECggEAJcTg9hWBHL9K8EP6E3shc0kyIN7uN4NgO+svzSIRHJpk
CPby72BxKQhMZHpVS6KGrt1fKY4NdpYjkhlgSN9gBu+rbA7diJYJW4QIS73P2HxL
D9GsZb9Mxt7EPhvW/8aLtqou5YzSG9RreMXprPcUaNq3rnIEOLslr+12RWfhOOWY
9pDbBSGJH8gZFDFU8ADlXGJBxOoa/cIo2UWxmRhuAiJr8Sx1M0NqS4gplFfAJHWg
+XuXZKf6JDbW/ponA1bYWsw4hjsW3AWC3vQdjUPu3KU+LT8MwSg+26pzQQRPpCzG
2713vVhnG+fT5J57o6ThJmdKPu3F2sK3Yix7KgKDOQKBgQD61gE5JkdyaZIai3DJ
y8BTuo4/wM0b1XsU+0QZuwPWuzKm0YybnRmpd7goG+0rxHv8zguXeAsu8hi/FndM
7mksPE8IG6E1miK+/7hznx28FgyopoBJrQkV9BDwdhaBvNqymnOIYW85OlT2UMhi
8FvfiXEU4S3DvyBa2czSjR+VdQKBgQDIQIfTEI5AH4yKRg7RgJWSv2xJmD3yp1Yt
T7ugm8eF2+/D7WmGPVDBdthU29DHZiKPUtTrRGYEG24ZR7HXbKjuHUe0ZhTbAMee
iDAr3vbNSmuOFLLpWjFeX1xT8+0NG3nGDKIcA7gz+m/gYuNvB+zpFstZrAEkr5oP
EcVDnWnLeQKBgQDH1QRGdlOHN8nY8evaKEPBsKcw7TW6jfmvfnoDkbT+NkalFd5R
/vd5xlHlSlJJgxBQGAquEkm+jcrfOVOz61/IiQdhazmkTXaO+YUGP+ZdeKd/GJ6t
k3fgkH+KQlmt5DnK/jc6mH0Wd31GepcaE2juDj4Tp01hW/u3xTpjJ2DZHQKBgQCF
4E5t1vWi/PSSRMAHY/WbRAp7MSLJJQJCDLodZ8f+P8mNrR0NN9TTYkbChKqRhEC6
nN/n4bRqLoRutjW5FdXiSwTzIAP1XhIWdGnwCoHpQUWimUf7Jec3dn1dSwhB6QqC
U1PVcs8lQNqmorX2NtA2DJ0qeAnToupWBMVirMxb0QKBgBIUUBNJuzaXJiDaoaPn
n57c06/P25dYqx8PWaMN34b14wHs3/uCj+eA3nBFssWksqquX5JcNkeMA6aBB6N9
75NUN1p32VgOC6iuXPagkJw+30lv2yKZIJw19ftnKFrLGqwnya/NHCXsdfXMDbdp
WyfEXMH6ibm2xgVHoWA4ED/b
-----END PRIVATE KEY-----
`,
      client_email: 'demo-test@demo.iam.gserviceaccount.com'
    });
  }
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:6066';
  }
};

// Firebase Admin が読み込まれる前にエミュレータ用の環境変数を設定
ensureFirebaseEnv();

type StoreModule = typeof import('./channelConversationStore.js');

let loadChannelContext: StoreModule['loadChannelContext'];
let persistUserMessage: StoreModule['persistUserMessage'];
let persistAssistantMessage: StoreModule['persistAssistantMessage'];

const waitFor = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const createChannelId = (): string => `test-channel-${randomUUID()}`;

beforeAll(async () => {
  const module = await import('./channelConversationStore.js');
  loadChannelContext = module.loadChannelContext;
  persistUserMessage = module.persistUserMessage;
  persistAssistantMessage = module.persistAssistantMessage;
});

describe('channelConversationStore', () => {
  it('新規チャンネルは空の履歴を返す', async () => {
    const context = await loadChannelContext(createChannelId(), 20);
    expect(context.history).toEqual([]);
    expect(context.currentOutfit).toBeUndefined();
  });

  it('ユーザーメッセージ保存と履歴制限が機能する', async () => {
    const channelId = createChannelId();
    await persistUserMessage(channelId, { role: 'user', content: 'first' });
    await waitFor(5);
    await persistUserMessage(channelId, { role: 'user', content: 'second' });
    await waitFor(5);
    await persistUserMessage(channelId, { role: 'user', content: 'third' });

    const context = await loadChannelContext(channelId, 2);
    expect(context.history).toEqual([
      { role: 'user', content: 'second' },
      { role: 'user', content: 'third' }
    ]);
    expect(context.currentOutfit).toBeUndefined();
  });

  it('ユーザーとアシスタントのメッセージが交互に保存されても順序が維持される', async () => {
    const channelId = createChannelId();
    await persistUserMessage(channelId, { role: 'user', content: 'user-1' });
    await waitFor(5);
    await persistAssistantMessage(channelId, { role: 'assistant', content: 'assistant-1' }, '制服スタイル');
    await waitFor(5);
    await persistUserMessage(channelId, { role: 'user', content: 'user-2' });
    await waitFor(5);
    await persistAssistantMessage(channelId, { role: 'assistant', content: 'assistant-2' }, 'カジュアル');

    const context = await loadChannelContext(channelId, 10);
    expect(context.history).toEqual([
      { role: 'user', content: 'user-1' },
      { role: 'assistant', content: 'assistant-1' },
      { role: 'user', content: 'user-2' },
      { role: 'assistant', content: 'assistant-2' }
    ]);
    expect(context.currentOutfit).toBe('カジュアル');
  });

  it('複数のアシスタントメッセージ保存でcurrentOutfitが最新に上書きされる', async () => {
    const channelId = createChannelId();
    await persistAssistantMessage(channelId, { role: 'assistant', content: '一回目' }, '制服スタイル');
    await waitFor(5);
    await persistAssistantMessage(channelId, { role: 'assistant', content: '二回目' }, 'お出かけコーデ');
    await waitFor(5);
    await persistAssistantMessage(channelId, { role: 'assistant', content: '三回目' }, 'ルームウェア');

    const context = await loadChannelContext(channelId, 10);
    expect(context.history).toEqual([
      { role: 'assistant', content: '一回目' },
      { role: 'assistant', content: '二回目' },
      { role: 'assistant', content: '三回目' }
    ]);
    expect(context.currentOutfit).toBe('ルームウェア');
  });

  it('異なるチャンネル間で履歴と服装が独立して管理される', async () => {
    const channelA = createChannelId();
    const channelB = createChannelId();

    await persistUserMessage(channelA, { role: 'user', content: 'A-user' });
    await persistAssistantMessage(channelA, { role: 'assistant', content: 'A-assistant' }, 'A-スタイル');
    await persistUserMessage(channelB, { role: 'user', content: 'B-user' });
    await persistAssistantMessage(channelB, { role: 'assistant', content: 'B-assistant' }, 'B-スタイル');

    const contextA = await loadChannelContext(channelA, 10);
    const contextB = await loadChannelContext(channelB, 10);

    expect(contextA.history).toEqual([
      { role: 'user', content: 'A-user' },
      { role: 'assistant', content: 'A-assistant' }
    ]);
    expect(contextA.currentOutfit).toBe('A-スタイル');

    expect(contextB.history).toEqual([
      { role: 'user', content: 'B-user' },
      { role: 'assistant', content: 'B-assistant' }
    ]);
    expect(contextB.currentOutfit).toBe('B-スタイル');
  });
});
