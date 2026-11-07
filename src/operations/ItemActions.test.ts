// @vitest-environment happy-dom
/** @file Tests for the sheets' actions: rolling a skill, giving or taking a Free Rank, and confirming a deletion. */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenesysActor } from '@/actor/GenesysActor';
import type { GenesysItem } from '@/item/GenesysItem';

// The Dice Prompt and the crew member prompt are Foundry applications, which the test stands in for: it records the
// checks asked for.
const { promptForRoll } = vi.hoisted(() => ({ promptForRoll: vi.fn() }));
vi.mock('@/app/DicePrompt', () => ({ DicePrompt: { promptForRoll }, RollType: {} }));
vi.mock('@/operations/CrewRoll', () => ({ rollForCrew: vi.fn() }));

const { confirmDelete, freeSkillRank, rollSkill } = await import('@/operations/ItemActions');

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

describe('confirmDelete', () => {
	// Foundry's confirmation dialog, which records what it asks and answers Yes.
	const confirm = vi.fn(async () => true);

	beforeEach(() => {
		confirm.mockClear();
		vi.stubGlobal('foundry', { applications: { api: { DialogV2: { confirm } } } });
		vi.stubGlobal('game', {
			i18n: { format: (key: string, data: Record<string, string>) => `${key} ${Object.values(data).join(', ')}` },
		});
	});

	/** What the dialog asked: its title, its text, and whether closing it rejects. */
	function asked() {
		const [options] = confirm.mock.calls[0] as unknown as [{ window: { title: string }; content: HTMLElement; rejectClose: boolean }];
		return { title: options.window.title, text: options.content.textContent, rejectClose: options.rejectClose };
	}

	it('names what it deletes, as text, and closing it answers No', async () => {
		expect(await confirmDelete('<b>Blaster</b>')).toBe(true);

		expect(asked()).toEqual({
			title: 'Genesys.Dialogs.ConfirmDelete.Title',
			text: 'Genesys.Dialogs.ConfirmDelete.Content <b>Blaster</b>',
			rejectClose: false,
		});
	});

	it('asks a deletion that says what it does in its own words', async () => {
		await confirmDelete({ title: 'Genesys.Dialogs.ConfirmUndoEntry.Title', question: 'Undo the XP award "Session 3"?' });

		expect(asked()).toEqual({
			title: 'Genesys.Dialogs.ConfirmUndoEntry.Title',
			text: 'Undo the XP award "Session 3"?',
			rejectClose: false,
		});
	});

	it('answers No unless the user answers Yes', async () => {
		confirm.mockResolvedValueOnce(null as unknown as boolean);

		expect(await confirmDelete('Blaster')).toBe(false);
	});
});
