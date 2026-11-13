/** @file Tests for the Story Points a check spends from the Dice Prompt, against the Core Rulebook. */

import { describe, expect, it } from 'vitest';
import {
	canRollWithSpends,
	CheckSpend,
	chosenSpends,
	type SpendContext,
	spendGlyphs,
	spendOptions,
	spentPoints,
} from '@/dice/CheckStoryPoints';

const player: SpendContext = { isGM: false, gmConnected: true, storyPoints: { player: 2, gm: 2 }, impossible: false };
const gm: SpendContext = { ...player, isGM: true };

describe('spendOptions', () => {
	it('offers a player one point of the player pool to upgrade the ability, and no spend from the GM pool (CRB p. 28)', () => {
		expect(spendOptions([], player)).toEqual([{ spend: CheckSpend.UpgradeAbility, pool: 'player' }]);
	});

	it("offers a GM one point of the GM pool to upgrade the ability, and a player's point to upgrade the difficulty (CRB pp. 28–29)", () => {
		expect(spendOptions([], gm)).toEqual([
			{ spend: CheckSpend.UpgradeAbility, pool: 'gm' },
			{ spend: CheckSpend.UpgradeDifficulty, pool: 'player' },
		]);
	});

	it("offers an Impossible task's point first, from the roller's pool (CRB p. 18)", () => {
		expect(spendOptions([], { ...player, impossible: true }).map(({ spend, pool }) => [spend, pool])).toEqual([
			[CheckSpend.Impossible, 'player'],
			[CheckSpend.UpgradeAbility, 'player'],
		]);
		expect(spendOptions([], { ...gm, impossible: true })[0]).toEqual({ spend: CheckSpend.Impossible, pool: 'gm' });
	});

	it('refuses a spend from an empty pool (CRB p. 28)', () => {
		const empty = { player: 0, gm: 0 };
		expect(spendOptions([], { ...player, storyPoints: empty })).toEqual([
			{ spend: CheckSpend.UpgradeAbility, pool: 'player', refusal: 'Genesys.DicePrompt.StoryPoints.EmptyPool' },
		]);
		expect(spendOptions([], { ...gm, storyPoints: { player: 1, gm: 0 } })).toEqual([
			{ spend: CheckSpend.UpgradeAbility, pool: 'gm', refusal: 'Genesys.DicePrompt.StoryPoints.EmptyPool' },
			{ spend: CheckSpend.UpgradeDifficulty, pool: 'player' },
		]);
	});

	it("refuses a player's spend while no GM is connected to write it", () => {
		expect(spendOptions([], { ...player, gmConnected: false })[0]?.refusal).toBe('Genesys.DicePrompt.StoryPoints.NoGM');
		expect(spendOptions([], { ...gm, gmConnected: false }).every(({ refusal }) => !refusal)).toBe(true);
	});

	it('refuses every other spend once the Impossible task\'s point is chosen, even with points to spare (CRB p. 18: "you cannot spend any additional Story Points on the check")', () => {
		expect(spendOptions([CheckSpend.Impossible], { ...player, impossible: true })).toEqual([
			{ spend: CheckSpend.Impossible, pool: 'player' },
			{ spend: CheckSpend.UpgradeAbility, pool: 'player', refusal: 'Genesys.DicePrompt.StoryPoints.ImpossibleOnly' },
		]);
		expect(spendOptions([CheckSpend.Impossible], { ...gm, impossible: true })).toEqual([
			{ spend: CheckSpend.Impossible, pool: 'gm' },
			{ spend: CheckSpend.UpgradeAbility, pool: 'gm', refusal: 'Genesys.DicePrompt.StoryPoints.ImpossibleOnly' },
			{ spend: CheckSpend.UpgradeDifficulty, pool: 'player', refusal: 'Genesys.DicePrompt.StoryPoints.ImpossibleOnly' },
		]);
	});

	it("offers the other spends again once the Impossible task's point is unchecked (CRB p. 18)", () => {
		expect(spendOptions([], { ...gm, impossible: true }).map(({ refusal }) => refusal)).toEqual([undefined, undefined, undefined]);
	});

	it('leaves a chosen spend open, so that the roller can take it back, even once its pool is empty', () => {
		expect(spendOptions([CheckSpend.UpgradeAbility], { ...player, storyPoints: { player: 0, gm: 3 } })).toEqual([
			{ spend: CheckSpend.UpgradeAbility, pool: 'player' },
		]);
	});
});

describe('chosenSpends', () => {
	it('keeps each spend once per check, in the order the prompt offers them (CRB p. 28)', () => {
		expect(chosenSpends([CheckSpend.UpgradeDifficulty, CheckSpend.UpgradeAbility, CheckSpend.UpgradeAbility], gm)).toEqual([
			CheckSpend.UpgradeAbility,
			CheckSpend.UpgradeDifficulty,
		]);
	});

	it("takes back the other spends once the Impossible task's point is chosen (CRB p. 18)", () => {
		expect(
			chosenSpends([CheckSpend.UpgradeAbility, CheckSpend.Impossible, CheckSpend.UpgradeDifficulty], { ...gm, impossible: true }),
		).toEqual([CheckSpend.Impossible]);
	});

	it("drops the point of a task no longer Impossible, and a player's upgrade of the difficulty a player can't spend", () => {
		expect(chosenSpends([CheckSpend.Impossible, CheckSpend.UpgradeDifficulty], player)).toEqual([]);
	});
});

describe('spentPoints', () => {
	it("takes a player's points from the player pool, an Impossible task's and the upgrade's (CRB pp. 18, 28)", () => {
		expect(spentPoints([CheckSpend.Impossible, CheckSpend.UpgradeAbility], false)).toEqual({ player: 2 });
	});

	it("takes a GM's points from the GM pool, and the player's upgrade of the difficulty from the player pool (CRB pp. 28–29)", () => {
		expect(spentPoints([CheckSpend.UpgradeAbility, CheckSpend.UpgradeDifficulty], true)).toEqual({ gm: 1, player: 1 });
	});

	it('takes no point without a spend', () => {
		expect(spentPoints([], true)).toEqual({});
	});
});

describe('spendGlyphs', () => {
	it('upgrades the ability or the difficulty once for each upgrade, and adds nothing for an Impossible task (CRB pp. 18, 28–29)', () => {
		expect(spendGlyphs([CheckSpend.Impossible, CheckSpend.UpgradeAbility, CheckSpend.UpgradeDifficulty])).toEqual(['^', '*']);
	});
});

describe('canRollWithSpends', () => {
	it('rolls an Impossible task only once its point is spent (CRB p. 18)', () => {
		expect(canRollWithSpends([CheckSpend.UpgradeAbility], true)).toBe(false);
		expect(canRollWithSpends([CheckSpend.Impossible], true)).toBe(true);
	});

	it('rolls any other check without a spend', () => {
		expect(canRollWithSpends([], false)).toBe(true);
	});
});
