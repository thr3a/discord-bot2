import { Timestamp } from 'firebase-admin/firestore';
import { firestore } from '#config/firebaseAdmin.js';
import type { ChannelContext, ConversationEntry, ConversationRole } from '#types/conversation.js';

type MessageDocument = {
  role: ConversationRole;
  content: string;
  createdAt: Timestamp;
};

type ChannelDocument = {
  currentOutfit?: string;
  updatedAt?: Timestamp;
};

const channelsCollection = firestore.collection('channels');

export const loadChannelContext = async (channelId: string, historyLimit: number): Promise<ChannelContext> => {
  const channelRef = channelsCollection.doc(channelId);
  const messagesRef = channelRef.collection('messages');

  const [channelSnapshot, messageSnapshots] = await Promise.all([
    channelRef.get(),
    messagesRef.orderBy('createdAt', 'desc').limit(historyLimit).get()
  ]);

  const channelData = channelSnapshot.exists ? ((channelSnapshot.data() as ChannelDocument) ?? undefined) : undefined;

  const history = messageSnapshots.docs
    .map((doc) => doc.data() as MessageDocument)
    .reverse()
    .map((doc) => ({ role: doc.role, content: doc.content }));

  return {
    history,
    currentOutfit: channelData?.currentOutfit
  };
};

const appendMessage = async (channelId: string, entry: ConversationEntry): Promise<void> => {
  const messageRef = channelsCollection.doc(channelId).collection('messages');
  const document: MessageDocument = {
    role: entry.role,
    content: entry.content,
    createdAt: Timestamp.now()
  };
  await messageRef.add(document);
};

export const persistUserMessage = async (channelId: string, entry: ConversationEntry): Promise<void> => {
  await appendMessage(channelId, entry);
};

export const persistAssistantMessage = async (
  channelId: string,
  entry: ConversationEntry,
  outfit: string
): Promise<void> => {
  await Promise.all([
    appendMessage(channelId, entry),
    channelsCollection.doc(channelId).set(
      {
        currentOutfit: outfit,
        updatedAt: Timestamp.now()
      },
      { merge: true }
    )
  ]);
};
