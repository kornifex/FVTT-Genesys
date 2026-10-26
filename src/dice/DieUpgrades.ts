/** @file Upgrading a die of a dice pool, apart from the dice classes so that a module can use it without Foundry. */

import type { DieName } from '@/dice/DicePool';

/**
 * Upgrade a die of a pool: turn a die of the base type into a die of the upgraded type, or add a die of the base type
 * when none is left, which the next upgrade turns into a die of the upgraded type (CRB p. 22).
 */
export function upgradeDie(dice: Partial<Record<DieName, number>>, baseDie: DieName, upgradedDie: DieName) {
	if (dice[baseDie]) {
		dice[baseDie]--;
		dice[upgradedDie] = 1 + (dice[upgradedDie] ?? 0);
	} else {
		dice[baseDie] = 1 + (dice[baseDie] ?? 0);
	}
}
