import { z } from 'zod';
import type { ScenarioPrompt } from '#types/scenario.js';

export type ConversationRole = 'user' | 'assistant';
export type PersonaId = string;

export type UserConversationEntry = {
  role: 'user';
  content: string;
};

export type AssistantConversationEntry = {
  role: 'assistant';
  content: string;
  personaId: PersonaId;
};

export type ConversationEntry = UserConversationEntry | AssistantConversationEntry;

export const responseModeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('all') }),
  z.object({
    type: z.literal('single'),
    personaId: z.string().min(1)
  })
]);

export type ResponseMode = z.infer<typeof responseModeSchema>;
export type SingleResponseMode = Extract<ResponseMode, { type: 'single' }>;

export const isSingleResponseMode = (mode: ResponseMode): mode is SingleResponseMode => mode.type === 'single';

export type PersonaStateSnapshot = {
  currentOutfit?: string;
};

export type PersonaStateMap = Record<PersonaId, PersonaStateSnapshot>;

export type ChannelContext = {
  history: ConversationEntry[];
  personaStates: PersonaStateMap;
  scenario: ScenarioPrompt;
  responseMode: ResponseMode;
};

export const defaultResponseMode: ResponseMode = { type: 'all' };
