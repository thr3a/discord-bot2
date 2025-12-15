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

export const channelStateSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('idle') }),
  z.object({
    type: z.literal('situation_input'),
    personaCount: z.number().int().min(1).max(3),
    requestedBy: z.string().min(1)
  }),
  z.object({
    type: z.literal('scenario_preview'),
    personaCount: z.number().int().min(1).max(3),
    requestedBy: z.string().min(1),
    previewMessageId: z.string().min(1)
  }),
  z.object({ type: z.literal('awaiting_reinput') }),
  z.object({
    type: z.literal('prompt_situation_input'),
    personaCount: z.number().int().min(1).max(3),
    requestedBy: z.string().min(1)
  })
]);

export type ChannelState = z.infer<typeof channelStateSchema>;

export type ChannelContext = {
  history: ConversationEntry[];
  personaStates: PersonaStateMap;
  scenario: ScenarioPrompt;
  responseMode: ResponseMode;
  state: ChannelState;
};

export const defaultResponseMode: ResponseMode = { type: 'all' };
export const defaultChannelState: ChannelState = { type: 'idle' };
