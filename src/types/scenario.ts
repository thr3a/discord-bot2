import { z } from 'zod';

export const personaPromptSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  archetype: z.string().min(1),
  profile: z.string().min(1),
  speechStyle: z.string().min(1)
});

export const scenarioPromptSchema = z.object({
  commonSetting: z.string().min(1),
  commonGuidelines: z.string().min(1),
  personas: z.array(personaPromptSchema).min(1)
});

export type PersonaPrompt = z.infer<typeof personaPromptSchema>;
export type ScenarioPrompt = z.infer<typeof scenarioPromptSchema>;
