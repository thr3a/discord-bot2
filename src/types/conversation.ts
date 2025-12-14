export type ConversationRole = 'user' | 'assistant';

export type ConversationEntry = {
  role: ConversationRole;
  content: string;
};

export type ChannelContext = {
  history: ConversationEntry[];
  currentOutfit: string | undefined;
};
