import { describe, expect, it } from 'vitest';
import { applyItemChanges, isItemChangeKey, itemChangeKey, itemChangeTotals } from '@/item/ItemChanges';

describe('itemChangeTotals', () => {
	const damage = (value: unknown, disabled = false) => ({ disabled, changes: [{ key: 'genesys.item.baseDamage', value }] });

	it("sums the enabled changes to each field, as an attachment's base modifiers (CRB pp. 206–209)", () => {
		expect(
			itemChangeTotals([damage('1'), damage(1), { disabled: false, changes: [{ key: 'genesys.item.critical', value: '-1' }] }]),
		).toEqual({ baseDamage: 2, critical: -1 });
	});

	it('leaves out a disabled effect, as a modification option the table has not installed', () => {
		expect(itemChangeTotals([damage('1', true)])).toEqual({});
	});

	it("counts a change once per rank, as a quality's rating scales it", () => {
		expect(itemChangeTotals([{ ...damage('1'), rank: 3 }])).toEqual({ baseDamage: 3 });
	});

	it('ignores a value that is no number, a key naming no field, and the changes to the actor', () => {
		expect(
			itemChangeTotals([
				damage('B'),
				damage(''),
				{ disabled: false, changes: [{ key: 'genesys.item.rarity', value: '1' }] },
				{ disabled: false, changes: [{ key: 'system.soak', value: '1' }] },
			]),
		).toEqual({});
	});
});

describe('isItemChangeKey', () => {
	it("recognises an Item Change's key, which never applies to an actor, whatever field it names", () => {
		expect(isItemChangeKey(itemChangeKey('soak'))).toBe(true);
		expect(isItemChangeKey('genesys.item.rarity')).toBe(true);
		expect(isItemChangeKey('genesys.pool.check.self.')).toBe(false);
		expect(isItemChangeKey(undefined)).toBe(false);
	});
});

describe('applyItemChanges', () => {
	it('adds the damage and Critical changes to every Weapon Profile of a weapon, and its encumbrance once', () => {
		const weapon = {
			baseDamage: 5,
			critical: 3,
			encumbrance: 2,
			extraProfiles: [{ baseDamage: 3, critical: 4 }],
		};

		applyItemChanges(weapon, { baseDamage: 1, critical: -1, encumbrance: -1 });

		expect(weapon).toEqual({ baseDamage: 6, critical: 2, encumbrance: 1, extraProfiles: [{ baseDamage: 4, critical: 3 }] });
	});

	it('keeps a Critical rating at 1 or more, which the attack card counts Advantage by', () => {
		const weapon = { baseDamage: 5, critical: 1 };

		applyItemChanges(weapon, { critical: -2 });

		expect(weapon.critical).toBe(1);
	});

	it("changes an armor's defense and soak, and leaves alone the fields its type lacks", () => {
		const armor: Record<string, number> = { defense: 0, soak: 1, encumbrance: 3 };

		applyItemChanges(armor, { defense: 1, soak: 1, baseDamage: 2 });

		expect(armor).toEqual({ defense: 1, soak: 2, encumbrance: 3 });
	});
});
