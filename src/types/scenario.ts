import { z } from 'zod';

export const humanCharacterSchema = z.object({
  name: z.string().min(1),
  gender: z.string().min(1),
  age: z.number().min(1),
  personality: z.string().min(1),
  background: z.string().min(1)
});

export const personaPromptSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  gender: z.string().min(1),
  age: z.number().min(1),
  firstPerson: z.string().min(1),
  secondPerson: z.string().min(1),
  personality: z.string().min(1),
  outfit: z.string().min(1),
  background: z.string().min(1),
  relationship: z.string().min(1)
});

export const worldSettingSchema = z.object({
  location: z.string().min(1),
  time: z.string().min(1),
  situation: z.string().min(1)
});

export const scenarioPromptSchema = z.object({
  worldSetting: worldSettingSchema,
  humanCharacter: humanCharacterSchema,
  personas: z.array(personaPromptSchema).min(1).max(3)
});

export type HumanCharacterSetting = z.infer<typeof humanCharacterSchema>;
export type PersonaPrompt = z.infer<typeof personaPromptSchema>;
export type WorldSetting = z.infer<typeof worldSettingSchema>;
export type ScenarioPrompt = z.infer<typeof scenarioPromptSchema>;
