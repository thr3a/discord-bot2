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

ensureFirebaseEnv();

type StoreModule = typeof import('./channelConversationStore.js');

let loadChannelContext: StoreModule['loadChannelContext'];
let persistUserMessage: StoreModule['persistUserMessage'];
let persistAssistantMessage: StoreModule['persistAssistantMessage'];
let clearChannelConversation: StoreModule['clearChannelConversation'];
let updateResponseMode: StoreModule['updateResponseMode'];

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
  clearChannelConversation = module.clearChannelConversation;
  updateResponseMode = module.updateResponseMode;
});

const personaStates = {
  empty: {
    tsun: {},
    yan: {}
  },
  tsunOutfit: (outfit: string) => ({
    tsun: { currentOutfit: outfit },
    yan: {}
  }),
  bothOutfit: (tsunOutfit: string, yanOutfit: string) => ({
    tsun: { currentOutfit: tsunOutfit },
    yan: { currentOutfit: yanOutfit }
  })
};

describe('channelConversationStore', () => {
  it('新規チャンネルはデフォルトシナリオと空の履歴を返す', async () => {
    const context = await loadChannelContext(createChannelId(), 20);
    expect(context.history).toEqual([]);
    expect(context.responseMode).toEqual({ type: 'all' });
    expect(Object.keys(context.personaStates)).toEqual(expect.arrayContaining(['tsun', 'yan']));
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
  });

  it('ユーザーとアシスタントのメッセージ順が維持され、キャラクターIDも保存される', async () => {
    const channelId = createChannelId();
    await persistUserMessage(channelId, { role: 'user', content: 'user-1' });
    await waitFor(5);
    await persistAssistantMessage(
      channelId,
      { role: 'assistant', content: 'assistant-1', personaId: 'tsun' },
      personaStates.tsunOutfit('制服スタイル')
    );
    await waitFor(5);
    await persistUserMessage(channelId, { role: 'user', content: 'user-2' });
    await waitFor(5);
    await persistAssistantMessage(
      channelId,
      { role: 'assistant', content: 'assistant-2', personaId: 'yan' },
      personaStates.bothOutfit('制服スタイル', 'カジュアル')
    );

    const context = await loadChannelContext(channelId, 10);
    expect(context.history).toEqual([
      { role: 'user', content: 'user-1' },
      { role: 'assistant', content: 'assistant-1', personaId: 'tsun' },
      { role: 'user', content: 'user-2' },
      { role: 'assistant', content: 'assistant-2', personaId: 'yan' }
    ]);
    const tsunState = context.personaStates.tsun;
    if (!tsunState) {
      throw new Error('tsunの状態が存在しません');
    }
    const yanState = context.personaStates.yan;
    if (!yanState) {
      throw new Error('yanの状態が存在しません');
    }
    expect(tsunState.currentOutfit).toBe('制服スタイル');
    expect(yanState.currentOutfit).toBe('カジュアル');
  });

  it('レスポンスモードの更新が永続化される', async () => {
    const channelId = createChannelId();
    await updateResponseMode(channelId, { type: 'single', personaId: 'yan' });
    const context = await loadChannelContext(channelId, 5);
    expect(context.responseMode).toEqual({ type: 'single', personaId: 'yan' });
  });

  it('clearChannelConversationで履歴がリセットされ、モードはデフォルトに戻る', async () => {
    const channelId = createChannelId();
    await persistUserMessage(channelId, { role: 'user', content: '消去対象' });
    await persistAssistantMessage(
      channelId,
      { role: 'assistant', content: '直前の返答', personaId: 'tsun' },
      personaStates.tsunOutfit('前の服装')
    );
    await updateResponseMode(channelId, { type: 'single', personaId: 'tsun' });

    await clearChannelConversation(channelId);

    const context = await loadChannelContext(channelId, 10);
    expect(context.history).toEqual([]);
    expect(context.responseMode).toEqual({ type: 'all' });
    expect(Object.values(context.personaStates).every((state) => !state.currentOutfit)).toBe(true);
  });
});
