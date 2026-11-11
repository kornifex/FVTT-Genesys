import { describe, expect, it } from 'vitest';
import { damageLevel, damageStep, isUnusable } from '@/item/data/EquipmentDamage';

describe('damageLevel', () => {
	it('counts the steps from undamaged', () => {
		expect(damageLevel('undamaged')).toBe(0);
		expect(damageLevel('minor')).toBe(1);
		expect(damageLevel('moderate')).toBe(2);
		expect(damageLevel('major')).toBe(3);
	});

	it('reads a damage it does not know as undamaged', () => {
		expect(damageLevel('scratched' as 'minor')).toBe(0);
	});
});

describe('damageStep', () => {
	it('damages an item one step at a time, from undamaged to minor, moderate and major (CRB p. 88-89)', () => {
		expect(damageStep('undamaged', 1)).toBe('minor');
		expect(damageStep('minor', 1)).toBe('moderate');
		expect(damageStep('moderate', 1)).toBe('major');
	});

	it('destroys an item with major damage (CRB p. 88)', () => {
		expect(damageStep('major', 1)).toBe('destroyed');
	});

	it("steps an item's damage back down, to undamaged", () => {
		expect(damageStep('major', -1)).toBe('moderate');
		expect(damageStep('moderate', -1)).toBe('minor');
		expect(damageStep('minor', -1)).toBe('undamaged');
		expect(damageStep('undamaged', -1)).toBeUndefined();
	});

	it('leaves an unknown damage as it is', () => {
		expect(damageStep('scratched' as 'minor', 1)).toBeUndefined();
		expect(damageStep('scratched' as 'minor', -1)).toBeUndefined();
	});
});

describe('isUnusable', () => {
	it('makes an item with major damage unusable, and no lesser damage (CRB p. 89, Table I.5-4)', () => {
		expect(isUnusable('major')).toBe(true);
		expect(isUnusable('moderate')).toBe(false);
		expect(isUnusable('minor')).toBe(false);
		expect(isUnusable('undamaged')).toBe(false);
	});
});
