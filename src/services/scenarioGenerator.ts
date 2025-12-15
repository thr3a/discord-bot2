import { generateObject } from 'ai';
import { dedent } from 'ts-dedent';
import { z } from 'zod';
import { roleplayModel } from '#config/openai.js';
import type { ScenarioPrompt } from '#types/scenario.js';

const humanSchema = z.object({
  name: z.string().min(1).describe('名前'),
  gender: z.string().min(1).describe('性別'),
  age: z.string().min(1).describe('年齢'),
  personality: z.string().min(1).describe('性格'),
  background: z.string().min(1).describe('背景')
});

const aiCharacterSchema = z.object({
  name: z.string().min(1).describe('名前'),
  gender: z.string().min(1).describe('性別'),
  age: z.string().min(1).describe('年齢'),
  firstPerson: z.string().min(1).describe('一人称 例:俺、わたし'),
  secondPerson: z.string().min(1).describe('二人称 例: あなた、〇〇くん'),
  personality: z.string().min(1).describe('性格'),
  outfit: z.string().min(1).describe('服装'),
  background: z.string().min(1).describe('背景')
});

const scenarioGenerationSchema = z.object({
  worldSetting: z
    .object({
      location: z.string().min(1).describe('ロールプレイの場所'),
      time: z.string().min(1).describe('ロールプレイの時間軸や時期'),
      situation: z.string().min(1).describe('ロールプレイが始まる具体的な状況')
    })
    .describe('世界観の設定'),
  humanCharacter: humanSchema,
  aiCharacters: z.array(aiCharacterSchema).min(1),
  relationship: z.string().min(1).describe('キャラクター間の関係性')
});

type ScenarioGenerationResult = z.infer<typeof scenarioGenerationSchema>;

const systemPrompt = dedent`
  あなたは、読者の想像力を掻き立て、深い没入感を与えるエロティックな物語を創り出すことに特化したプロの小説家です。
  あなたの任務は、入力されたシチュエーションを基に、ロールプレイの魅力を最大限に引き出すための詳細な世界観、キャラクター設定、プロットの骨子を構築することです。
  この設定は、クリエイター向けに創作のインスピレーションとなるアイデアを提供することを目的としています。
  入力されたシチュエーションから情報を一切抜け落としてはいけません。
  以下の項目それぞれに必ず文章で回答し、指定された人数分のキャラクター設定を出力してください。
`;

const buildUserPrompt = (situation: string, personaCount: number): string => {
  return dedent`
    キャラクター人数: ${personaCount}
    シチュエーション:
    ${situation.trim()}
  `;
};

const normalizePersonaId = (name: string, index: number, used: Set<string>): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const fallback = `persona-${index + 1}`;
  const baseId = base.length > 0 ? base : fallback;
  let candidate = baseId;
  let suffix = 1;
  while (used.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
};

const toScenarioPrompt = (raw: ScenarioGenerationResult, personaCount: number): ScenarioPrompt => {
  const requestedCount = Math.max(1, Math.min(3, Math.floor(personaCount)));
  const usedIds = new Set<string>();
  const personas = raw.aiCharacters.slice(0, requestedCount).map((character, index) => {
    const displayName = character.name.trim();
    const id = normalizePersonaId(displayName, index, usedIds);
    return {
      id,
      displayName,
      gender: character.gender.trim(),
      age: character.age.trim(),
      firstPerson: character.firstPerson.trim(),
      secondPerson: character.secondPerson.trim(),
      personality: character.personality.trim(),
      outfit: character.outfit.trim(),
      background: character.background.trim()
    };
  });
  if (personas.length < requestedCount) {
    throw new Error(`想定より少ないキャラクターが生成されました (${personas.length}/${requestedCount})`);
  }
  return {
    worldSetting: {
      location: raw.worldSetting.location.trim(),
      time: raw.worldSetting.time.trim(),
      situation: raw.worldSetting.situation.trim()
    },
    humanCharacter: {
      name: raw.humanCharacter.name.trim(),
      gender: raw.humanCharacter.gender.trim(),
      age: raw.humanCharacter.age.trim(),
      personality: raw.humanCharacter.personality.trim(),
      background: raw.humanCharacter.background.trim()
    },
    relationship: raw.relationship.trim(),
    personas
  };
};

export const generateScenarioPrompt = async (situation: string, personaCount: number): Promise<ScenarioPrompt> => {
  const boundedCount = Math.max(1, Math.min(3, Math.floor(personaCount)));
  const { object } = await generateObject({
    model: roleplayModel,
    system: systemPrompt,
    schema: scenarioGenerationSchema,
    messages: [
      {
        role: 'user',
        content: buildUserPrompt(situation, boundedCount)
      }
    ]
  });
  return toScenarioPrompt(object, boundedCount);
};
