/** @file Tests for the sheets' actions on a skill: rolling it, and giving or taking a Free Rank. */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenesysActor } from '@/actor/GenesysActor';
import type { GenesysItem } from '@/item/GenesysItem';

// The Dice Prompt and the crew member prompt are Foundry applications, which the test stands in for: it records the
// checks asked for.
const { promptForRoll } = vi.hoisted(() => ({ promptForRoll: vi.fn() }));
vi.mock('@/app/DicePrompt', () => ({ DicePrompt: { promptForRoll }, RollType: {} }));
vi.mock('@/operations/CrewRoll', () => ({ rollForCrew: vi.fn() }));

const { freeSkillRank, rollSkill } = await import('@/operations/ItemActions');

type Skill = GenesysItem<'skill'>;

/** A skill of the given rank, which records the updates asked of it. */
function skillOfRank(rank: number) {
	const update = vi.fn();
	return { skill: { name: 'Athletics', system: { rank }, update } as unknown as Skill, update };
}

beforeEach(() => {
	promptForRoll.mockReset();
});

describe('rollSkill', () => {
	it('opens the Dice Prompt of a check of the skill, for the actor whose sheet rolls it', async () => {
		const actor = { name: 'Hero' } as GenesysActor;

		await rollSkill(actor, { name: 'Athletics' });

		expect(promptForRoll).toHaveBeenCalledExactlyOnceWith(actor, 'Athletics');
	});
});

describe('freeSkillRank', () => {
	it('gives the skill a rank, or takes one from it', async () => {
		const up = skillOfRank(2);
		const down = skillOfRank(2);

		await freeSkillRank(up.skill, 1);
		await freeSkillRank(down.skill, -1);

		expect(up.update).toHaveBeenCalledExactlyOnceWith({ system: { rank: 3 } });
		expect(down.update).toHaveBeenCalledExactlyOnceWith({ system: { rank: 1 } });
	});

	it('never takes a rank below 0', async () => {
		const { skill, update } = skillOfRank(0);

		await freeSkillRank(skill, -1);

		expect(update).toHaveBeenCalledExactlyOnceWith({ system: { rank: 0 } });
	});
});
