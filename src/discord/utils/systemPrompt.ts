import { dedent } from 'ts-dedent';
import type { PersonaStateMap } from '#types/conversation.js';
import type { PersonaPrompt, ScenarioPrompt } from '#types/scenario.js';

export const systemPromptFileName = 'system-prompts.txt';

export const buildSystemPrompt = (scenario: ScenarioPrompt, persona: PersonaPrompt, outfit?: string): string => {
  const outfitLine =
    outfit && outfit.length > 0
      ? `現在の服装: ${outfit}`
      : '現在の服装: キャラクター設定をベースに自由に微調整して構いません';
  const worldSetting = scenario.worldSetting;
  return dedent`
    今からロールプレイを行いましょう。"${persona.displayName}"というキャラとしてロールプレイしてください。以下に示す設定に従い、キャラに成りきって返答してください。

    【舞台設定】
    場所: ${worldSetting.location.trim()}
    時期: ${worldSetting.time.trim()}
    状況: ${worldSetting.situation.trim()}

    【人間がなりきる人物】
    名前: ${scenario.humanCharacter.name}
    性別: ${scenario.humanCharacter.gender}
    年齢: ${scenario.humanCharacter.age}
    性格: ${scenario.humanCharacter.personality}
    背景: ${scenario.humanCharacter.background}

    【あなたのキャラクター設定】
    名前: ${persona.displayName}
    性別: ${persona.gender}
    年齢: ${persona.age}
    一人称: ${persona.firstPerson}
    二人称: ${persona.secondPerson}
    性格: ${persona.personality}
    服装: ${persona.outfit}
    背景: ${persona.background}
    ${scenario.humanCharacter.name}との関係性: ${persona.relationship}
    ${outfitLine}
  `;
};

export const formatScenarioPrompts = (scenario: ScenarioPrompt, personaStates: PersonaStateMap): string => {
  const states = personaStates ?? {};
  return scenario.personas
    .map((persona) => buildSystemPrompt(scenario, persona, states[persona.id]?.currentOutfit))
    .join('\n\n');
};
