/**
 * @file Tests for the Attack Changes: their keys, and how they change the profile an attack is made with.
 */

import { describe, expect, it } from 'vitest';

import { attackChangeKey, changedAttack, decodeAttackChangeKey, isAttackChangeKey } from '@/effects/AttackChanges';

describe('the keys of the Attack Changes', () => {
	it('names what the change adds to and the attacks it applies to, and reads them back', () => {
		expect(attackChangeKey('damage', 'melee')).toBe('genesys.attack.damage.melee');
		expect(decodeAttackChangeKey('genesys.attack.damage.melee')).toEqual({ field: 'damage', scope: 'melee' });
		expect(decodeAttackChangeKey('genesys.attack.critical.combat')).toEqual({ field: 'critical', scope: 'combat' });
	});

	it('reads no other key as an Attack Change', () => {
		for (const key of [
			'genesys.attack.damage',
			'genesys.attack.soak.melee',
			'genesys.attack.damage.target',
			'genesys.item.baseDamage',
		]) {
			expect(decodeAttackChangeKey(key)).toBeUndefined();
			expect(isAttackChangeKey(key)).toBe(false);
		}
		expect(isAttackChangeKey('genesys.attack.critical.ranged')).toBe(true);
	});
});

describe('changedAttack', () => {
	const sword = { attackName: 'Sword', baseDamage: 3, critical: 2 };

	it('adds the damage and the Critical rating of every Attack Change to the profile, and keeps the rest of it', () => {
		expect(changedAttack(sword, [{ damage: 2 }, { damage: 1, critical: 1 }])).toEqual({
			attackName: 'Sword',
			baseDamage: 6,
			critical: 3,
		});
	});

	it('leaves the profile as it is without an Attack Change', () => {
		expect(changedAttack(sword, [])).toEqual(sword);
	});

	it('keeps a Critical rating at 1 or more, by which the card counts the Advantage spent on a Critical Injury', () => {
		expect(changedAttack(sword, [{ critical: -4 }]).critical).toBe(1);
	});

	it('leaves a Critical rating of 0 at 0: no Advantage triggers a Critical Injury then', () => {
		expect(changedAttack({ baseDamage: 3, critical: 0 }, [{ critical: 2 }]).critical).toBe(0);
	});
});
