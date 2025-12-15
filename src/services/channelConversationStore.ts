import { type CollectionReference, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { defaultScenarioPrompt } from '#config/defaultScenario.js';
import { firestore } from '#config/firebaseAdmin.js';
import type {
  AssistantConversationEntry,
  ChannelContext,
  ChannelState,
  ConversationEntry,
  ConversationRole,
  PersonaId,
  PersonaStateMap,
  ResponseMode,
  UserConversationEntry
} from '#types/conversation.js';
import {
  channelStateSchema,
  defaultChannelState,
  defaultResponseMode,
  isSingleResponseMode,
  responseModeSchema
} from '#types/conversation.js';
import { type ScenarioPrompt, scenarioPromptSchema } from '#types/scenario.js';

type MessageDocument = {
  role: ConversationRole;
  content: string;
  personaId?: PersonaId;
  createdAt: Timestamp;
};

type ChannelDocument = {
  scenario?: ScenarioPrompt;
  personaStates?: PersonaStateMap;
  responseMode?: ResponseMode;
  state?: ChannelState;
  updatedAt?: Timestamp;
};

type LegacyChannelDocument = ChannelDocument & {
  currentOutfit?: string;
};

const channelsCollection = firestore.collection('channels');

const getMessagesCollection = (channelId: string): CollectionReference<MessageDocument> => {
  return channelsCollection.doc(channelId).collection('messages') as CollectionReference<MessageDocument>;
};

const parseScenarioPrompt = (candidate?: unknown): ScenarioPrompt | undefined => {
  if (!candidate) return undefined;
  const parsed = scenarioPromptSchema.safeParse(candidate);
  if (!parsed.success) {
    console.warn('シナリオデータのパースに失敗したためデフォルト値を使用します', parsed.error);
    return undefined;
  }
  return parsed.data;
};

const normalizePersonaStates = (scenario: ScenarioPrompt, states?: PersonaStateMap): PersonaStateMap => {
  const normalized: PersonaStateMap = {};
  scenario.personas.forEach((persona) => {
    const current = states?.[persona.id]?.currentOutfit;
    const trimmed = typeof current === 'string' ? current.trim() : undefined;
    normalized[persona.id] = trimmed ? { currentOutfit: trimmed } : {};
  });
  return normalized;
};

const parseResponseMode = (candidate: unknown, scenario: ScenarioPrompt): ResponseMode | undefined => {
  if (!candidate) return undefined;
  const parsed = responseModeSchema.safeParse(candidate);
  if (!parsed.success) {
    console.warn('レスポンスモードのパースに失敗したためデフォルト値を使用します', parsed.error);
    return undefined;
  }
  const mode = parsed.data;
  if (isSingleResponseMode(mode)) {
    const exists = scenario.personas.some((persona) => persona.id === mode.personaId);
    if (!exists) {
      console.warn(
        `存在しないキャラクターIDが指定されたためレスポンスモードを初期化します personaId=${mode.personaId}`
      );
      return undefined;
    }
  }
  return mode;
};

const parseChannelState = (candidate?: unknown): ChannelState | undefined => {
  if (!candidate) return undefined;
  const parsed = channelStateSchema.safeParse(candidate);
  if (!parsed.success) {
    console.warn('チャンネル状態のパースに失敗したため初期値を使用します', parsed.error);
    return undefined;
  }
  return parsed.data;
};

const deleteLegacyFieldsIfNeeded = (rawData?: LegacyChannelDocument): Record<string, unknown> => {
  if (!rawData?.currentOutfit) return {};
  return {
    currentOutfit: FieldValue.delete()
  };
};

export const loadChannelContext = async (channelId: string, historyLimit: number): Promise<ChannelContext> => {
  const channelRef = channelsCollection.doc(channelId);
  const messagesRef = getMessagesCollection(channelId);

  const [channelSnapshot, messageSnapshots] = await Promise.all([
    channelRef.get(),
    messagesRef.orderBy('createdAt', 'desc').limit(historyLimit).get()
  ]);

  const rawData = channelSnapshot.exists ? ((channelSnapshot.data() as LegacyChannelDocument) ?? undefined) : undefined;

  let scenario = parseScenarioPrompt(rawData?.scenario);
  const pendingUpdates: Record<string, unknown> = {
    ...deleteLegacyFieldsIfNeeded(rawData)
  };
  if (!scenario) {
    scenario = defaultScenarioPrompt;
    pendingUpdates.scenario = scenario;
  }

  const normalizedStates = normalizePersonaStates(scenario, rawData?.personaStates);
  const shouldBootstrapStates =
    !rawData?.personaStates ||
    scenario.personas.some((persona) => !(rawData.personaStates && persona.id in rawData.personaStates));
  if (shouldBootstrapStates) {
    pendingUpdates.personaStates = normalizedStates;
  }

  let responseMode = parseResponseMode(rawData?.responseMode, scenario);
  if (!responseMode) {
    responseMode = defaultResponseMode;
    pendingUpdates.responseMode = responseMode;
  }

  let channelState = parseChannelState(rawData?.state);
  if (!channelState) {
    channelState = defaultChannelState;
    pendingUpdates.state = channelState;
  }

  if (Object.keys(pendingUpdates).length > 0) {
    pendingUpdates.updatedAt = Timestamp.now();
    await channelRef.set(pendingUpdates, { merge: true });
  }

  const history: ConversationEntry[] = messageSnapshots.docs
    .map((doc) => doc.data() as MessageDocument)
    .reverse()
    .map((doc) => {
      if (doc.role === 'assistant') {
        const personaId =
          doc.personaId && scenario.personas.some((persona) => persona.id === doc.personaId)
            ? doc.personaId
            : scenario.personas[0]?.id;
        return {
          role: 'assistant',
          content: doc.content,
          personaId: personaId ?? 'assistant'
        };
      }
      return { role: 'user', content: doc.content };
    });

  return {
    history,
    personaStates: normalizedStates,
    scenario,
    responseMode,
    state: channelState
  };
};

const appendMessage = async (channelId: string, entry: ConversationEntry): Promise<void> => {
  const messageRef = getMessagesCollection(channelId);
  const document: MessageDocument = {
    role: entry.role,
    content: entry.content,
    createdAt: Timestamp.now()
  };
  if (entry.role === 'assistant') {
    document.personaId = entry.personaId;
  }
  await messageRef.add(document);
};

export const persistUserMessage = async (channelId: string, entry: UserConversationEntry): Promise<void> => {
  await appendMessage(channelId, entry);
};

export const persistAssistantMessage = async (
  channelId: string,
  entry: AssistantConversationEntry,
  personaStates: PersonaStateMap
): Promise<void> => {
  await Promise.all([
    appendMessage(channelId, entry),
    channelsCollection.doc(channelId).set(
      {
        personaStates,
        updatedAt: Timestamp.now()
      },
      { merge: true }
    )
  ]);
};

export const updateResponseMode = async (channelId: string, responseMode: ResponseMode): Promise<void> => {
  await channelsCollection.doc(channelId).set(
    {
      responseMode,
      updatedAt: Timestamp.now()
    },
    { merge: true }
  );
};

export const persistChannelState = async (channelId: string, state: ChannelState): Promise<void> => {
  await channelsCollection.doc(channelId).set(
    {
      state,
      updatedAt: Timestamp.now()
    },
    { merge: true }
  );
};

export const persistScenarioPrompt = async (channelId: string, scenario: ScenarioPrompt): Promise<PersonaStateMap> => {
  const personaStates = normalizePersonaStates(scenario);
  await channelsCollection.doc(channelId).set(
    {
      scenario,
      personaStates,
      responseMode: defaultResponseMode,
      updatedAt: Timestamp.now()
    },
    { merge: true }
  );
  return personaStates;
};

const deleteMessagesInChunks = async (collection: CollectionReference<MessageDocument>): Promise<void> => {
  const batchSize = 500;
  while (true) {
    const snapshot = await collection.limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }
    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    if (snapshot.size < batchSize) {
      break;
    }
  }
};

export const clearChannelConversation = async (channelId: string): Promise<void> => {
  const messagesRef = getMessagesCollection(channelId);
  await deleteMessagesInChunks(messagesRef);
  await channelsCollection.doc(channelId).set(
    {
      personaStates: {},
      responseMode: defaultResponseMode,
      updatedAt: Timestamp.now()
    },
    { merge: true }
  );
};
