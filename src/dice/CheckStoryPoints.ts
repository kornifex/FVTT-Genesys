/**
 * @file The Story Points the roller spends on a check from the Dice Prompt: which pool pays each spend, each spend once
 * per check, and the point an Impossible task costs (CRB pp. 18, 28–30).
 */

import type { StoryPointPool, StoryPointSpend } from '@/data/StoryPoints';
import { GRADE_GLYPHS } from '@/dice/GenesysPoolModifications';
import type { StoryPointData } from '@/settings/storyPoints';

/**
 * What a Story Point buys on a check, each once per check.
 */
export const CheckSpend = {
	/** The roller's point to attempt an Impossible task, which buys nothing more (CRB p. 18). */
	Impossible: 'impossible',
	/** The roller's point upgrades the ability once (CRB p. 28). */
	UpgradeAbility: 'upgradeAbility',
	/**
	 * A player's point upgrades the difficulty once, as when they answer an NPC's check against their character (CRB
	 * p. 29). Only the GM, who rolls that check, spends it for them.
	 */
	UpgradeDifficulty: 'upgradeDifficulty',
} as const;

export type CheckSpend = (typeof CheckSpend)[keyof typeof CheckSpend];

/**
 * The Pool Modification each spend adds to the dice pool.
 */
export const SPEND_GLYPHS: Record<CheckSpend, string | undefined> = {
	[CheckSpend.Impossible]: undefined,
	[CheckSpend.UpgradeAbility]: GRADE_GLYPHS.UpgradeAbility,
	[CheckSpend.UpgradeDifficulty]: GRADE_GLYPHS.UpgradeDifficulty,
};

/**
 * Why the roller can't choose a spend, as the localization key the Dice Prompt shows.
 */
type SpendRefusal =
	| 'Genesys.DicePrompt.StoryPoints.EmptyPool'
	| 'Genesys.DicePrompt.StoryPoints.NoGM'
	| 'Genesys.DicePrompt.StoryPoints.ImpossibleOnly';

/**
 * What the Dice Prompt knows of the roller and the table when it offers the spends.
 */
export type SpendContext = {
	/** Whether the roller is a GM, who spends from the GM pool, and a player's point for them. */
	isGM: boolean;
	/** Whether a GM is connected, who writes a player's spend. */
	gmConnected: boolean;
	storyPoints: StoryPointData;
	/** Whether the check is an Impossible task. */
	impossible: boolean;
};

/**
 * A spend the Dice Prompt offers, and why the roller can't choose it, if they can't.
 */
export type SpendOption = { spend: CheckSpend; pool: StoryPointPool; refusal?: SpendRefusal };

/**
 * The pool a spend comes from: the roller's own, the player pool for a player and the GM pool for a GM, but for the
 * player's point a GM spends to upgrade the difficulty (CRB p. 28–29).
 */
function spendPool(spend: CheckSpend, isGM: boolean): StoryPointPool {
	return isGM && spend !== CheckSpend.UpgradeDifficulty ? 'gm' : 'player';
}

/**
 * The spends the Dice Prompt offers on a check: an Impossible task's point first, then the ability's upgrade, then for a
 * GM the player's upgrade of the difficulty. A player's prompt offers no spend from the GM pool, which only a GM writes.
 */
function offeredSpends({ isGM, impossible }: Pick<SpendContext, 'isGM' | 'impossible'>): CheckSpend[] {
	return [...(impossible ? [CheckSpend.Impossible] : []), CheckSpend.UpgradeAbility, ...(isGM ? [CheckSpend.UpgradeDifficulty] : [])];
}

/**
 * The spends the roller chose that the check still offers, in the order it offers them: the point of a task no longer
 * Impossible is spent no more, and once it is spent no other point is (CRB p. 18).
 */
export function chosenSpends(chosen: readonly CheckSpend[], context: Pick<SpendContext, 'isGM' | 'impossible'>): CheckSpend[] {
	const spends = offeredSpends(context).filter((spend) => chosen.includes(spend));
	return spends.includes(CheckSpend.Impossible) ? [CheckSpend.Impossible] : spends;
}

/**
 * The spends the Dice Prompt offers, each with the reason the roller can't choose it while they haven't: no GM is
 * connected to write a player's spend, its pool holds no point beyond those the spends already chosen take from it, or
 * the Impossible task's point is chosen, which allows no other. A chosen spend stays open, so that the roller can take
 * it back.
 */
export function spendOptions(chosen: readonly CheckSpend[], context: SpendContext): SpendOption[] {
	const spends = chosenSpends(chosen, context);
	const spent = spentPoints(spends, context.isGM);

	return offeredSpends(context).map((spend) => {
		const pool = spendPool(spend, context.isGM);
		if (spends.includes(spend)) {
			return { spend, pool };
		}
		if (spends.includes(CheckSpend.Impossible)) {
			return { spend, pool, refusal: 'Genesys.DicePrompt.StoryPoints.ImpossibleOnly' };
		}
		if (!context.isGM && !context.gmConnected) {
			return { spend, pool, refusal: 'Genesys.DicePrompt.StoryPoints.NoGM' };
		}
		return context.storyPoints[pool] > (spent[pool] ?? 0)
			? { spend, pool }
			: { spend, pool, refusal: 'Genesys.DicePrompt.StoryPoints.EmptyPool' };
	});
}

/**
 * The points the chosen spends take from each pool, one each.
 */
export function spentPoints(spends: readonly CheckSpend[], isGM: boolean): StoryPointSpend {
	const spent: StoryPointSpend = {};
	for (const spend of spends) {
		const pool = spendPool(spend, isGM);
		spent[pool] = (spent[pool] ?? 0) + 1;
	}
	return spent;
}

/**
 * The Pool Modifications the chosen spends add to the dice pool.
 */
export function spendGlyphs(spends: readonly CheckSpend[]): string[] {
	return spends.flatMap((spend) => SPEND_GLYPHS[spend] ?? []);
}

/**
 * Whether the check can be rolled with the chosen spends: an Impossible task only once its point is spent (CRB p. 18).
 */
export function canRollWithSpends(spends: readonly CheckSpend[], impossible: boolean) {
	return !impossible || spends.includes(CheckSpend.Impossible);
}
