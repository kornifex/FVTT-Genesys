/** @file What the Dice Prompt reads of the check it is opened for: what it is rolled for, the range it is made at, and where its Pool Modifications come from. */

import type { DicePromptRoll } from '@/app/DicePrompt';
import type { CheckPurpose } from '@/dice/Check';
import { MAGIC_ATTACK_RANGE } from '@/item/SpellCasting';
import type { PoolModificationSource } from '@/effects/PoolModifications';

/**
 * What a check is rolled for, by the roll the Dice Prompt opens with: an attack, a spell's casting, an initiative, or a
 * check of the roller's own.
 */
export function checkPurposeOf(roll: DicePromptRoll): CheckPurpose {
	switch (roll.type) {
		case 'attack':
			return { kind: 'attack', weaponName: roll.profile.attackName };

		case 'spell':
			return { kind: 'spell', spellName: roll.spell.name, isAttack: roll.spell.system.isAttack };

		case 'initiative':
			return { kind: 'initiative' };

		case 'skill':
			return { kind: 'check' };
	}
}

/**
 * The range band of the attack a roll makes: its Weapon Profile's, a magic attack's at short range, which meets the
 * defense of its target (CRB p. 215). None for a roll that attacks nothing.
 */
export function attackRangeOf(roll: DicePromptRoll) {
	switch (roll.type) {
		case 'attack':
			return roll.profile.range;

		case 'spell':
			return roll.spell.system.isAttack ? MAGIC_ATTACK_RANGE : undefined;

		case 'skill':
		case 'initiative':
			return undefined;
	}
}

/**
 * The localization key of the label that says whose effects a Pool Modification comes from: the roller's, or their
 * target's.
 */
export function poolModificationOriginLabel(source: PoolModificationSource) {
	return source === 'self' ? 'Genesys.DicePrompt.PoolModifications.SelfEffects' : 'Genesys.DicePrompt.PoolModifications.TargetEffects';
}
