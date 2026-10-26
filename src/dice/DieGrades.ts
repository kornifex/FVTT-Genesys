/** @file Upgrading and downgrading a die of a dice pool, apart from the dice classes so that a module can import them. */

import type { DicePool, DieName } from '@/dice/DicePool';

// The dice classes extend Foundry's `Die`, which a unit-tested module like the check links can't load.

/**
 * Upgrade a die of a pool: turn a die of the base type into a die of the upgraded type, or add a die of the base type
 * when none is left, which the next upgrade turns into a die of the upgraded type (CRB p. 22).
 */
export function upgradeDie(dice: DicePool['dice'], baseDie: DieName, upgradedDie: DieName) {
	if (dice[baseDie]) {
		dice[baseDie]--;
		dice[upgradedDie] = 1 + (dice[upgradedDie] ?? 0);
	} else {
		dice[baseDie] = 1;
	}
}

/**
 * Downgrade a die of a pool: turn a die of the upgraded type into a die of the base type, or do nothing when none is
 * left (CRB p. 22).
 */
export function downgradeDie(dice: DicePool['dice'], upgradedDie: DieName, baseDie: DieName) {
	if (dice[upgradedDie]) {
		dice[upgradedDie]--;
		dice[baseDie] = 1 + (dice[baseDie] ?? 0);
	}
}
