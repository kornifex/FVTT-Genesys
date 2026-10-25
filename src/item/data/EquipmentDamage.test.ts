import { describe, expect, it } from 'vitest';
import { damageStep } from '@/item/data/EquipmentDamage';

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
