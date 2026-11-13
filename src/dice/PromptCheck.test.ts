import { describe, expect, it } from 'vitest';
import type { DicePromptRoll } from '@/app/DicePrompt';
import { attackRangeOf, checkPurposeOf, poolModificationOriginLabel } from '@/dice/PromptCheck';

// The prompt's rolls carry Foundry documents; these tests give each only what the module reads of it.
const skill = { type: 'skill' } as DicePromptRoll;
const initiative = { type: 'initiative' } as DicePromptRoll;
const attack = { type: 'attack', profile: { attackName: 'Axe', range: 'engaged' } } as DicePromptRoll;
const spell = (isAttack: boolean) => ({ type: 'spell', spell: { name: 'Bolt', system: { isAttack } } }) as DicePromptRoll;

describe('checkPurposeOf', () => {
	it('names what each roll type rolls the check for', () => {
		expect(checkPurposeOf(skill)).toEqual({ kind: 'check' });
		expect(checkPurposeOf(initiative)).toEqual({ kind: 'initiative' });
		expect(checkPurposeOf(attack)).toEqual({ kind: 'attack', weaponName: 'Axe' });
		expect(checkPurposeOf(spell(true))).toEqual({ kind: 'spell', spellName: 'Bolt', isAttack: true });
	});
});

describe('attackRangeOf', () => {
	it("is a weapon profile's range for an attack", () => {
		expect(attackRangeOf(attack)).toBe('engaged');
	});

	it("meets a magic attack's target at short range (CRB p. 215)", () => {
		expect(attackRangeOf(spell(true))).toBe('short');
	});

	it('is none for a roll that attacks nothing', () => {
		expect(attackRangeOf(spell(false))).toBeUndefined();
		expect(attackRangeOf(skill)).toBeUndefined();
		expect(attackRangeOf(initiative)).toBeUndefined();
	});
});

describe('poolModificationOriginLabel', () => {
	it("tells the roller's effects from their target's", () => {
		expect(poolModificationOriginLabel('self')).toBe('Genesys.DicePrompt.PoolModifications.SelfEffects');
		expect(poolModificationOriginLabel('target')).toBe('Genesys.DicePrompt.PoolModifications.TargetEffects');
	});
});
