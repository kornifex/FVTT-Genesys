import { describe, expect, it } from 'vitest';
import { applyItemChanges, isItemChangeKey, itemChangeKey, type ItemChangeField, itemChangeTotals } from '@/item/ItemChanges';
import type { ContainedItemQuality } from '@/item/data/BaseWeaponDataModel';

/**
 * A rated quality of a weapon or an armor.
 */
function quality(id: string, name: string, rating: number): ContainedItemQuality {
	return { id, name, rating, isRated: true, description: '', activation: 'passive', advantageCost: 2 };
}

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

/**
 * An enabled effect whose Item Changes add a value to each field given, tagged with the quality given.
 */
function itemEffect(values: Partial<Record<ItemChangeField, number>>, quality?: string) {
	return {
		disabled: false,
		changes: Object.entries(values).map(([field, value]) => ({ key: itemChangeKey(field as ItemChangeField), value })),
		...(quality && { flags: { genesys: { quality } } }),
	};
}

describe('applyItemChanges', () => {
	it('adds the damage and Critical changes to every Weapon Profile of a weapon, and its encumbrance once', () => {
		const weapon = {
			baseDamage: 5,
			critical: 3,
			encumbrance: 2,
			extraProfiles: [{ baseDamage: 3, critical: 4 }],
		};

		applyItemChanges(weapon, [itemEffect({ baseDamage: 1, critical: -1, encumbrance: -1 })]);

		expect(weapon).toEqual({ baseDamage: 6, critical: 2, encumbrance: 1, extraProfiles: [{ baseDamage: 4, critical: 3 }] });
	});

	it('keeps a Critical rating at 1 or more, which the attack card counts Advantage by', () => {
		const weapon = { baseDamage: 5, critical: 1 };

		applyItemChanges(weapon, [itemEffect({ critical: -2 })]);

		expect(weapon.critical).toBe(1);
	});

	it("changes an armor's defense and soak, and leaves alone the fields its type lacks", () => {
		const armor: Record<string, number> = { defense: 0, soak: 1, encumbrance: 3 };

		applyItemChanges(armor, [itemEffect({ defense: 1, soak: 1, baseDamage: 2 })]);

		expect(armor).toEqual({ defense: 1, soak: 2, encumbrance: 3 });
	});

	it("counts a quality's changes once per rank of its rating (CRB pp. 86–89)", () => {
		const armor = { soak: 1, qualities: [quality('q1', 'Reinforced', 2)] };

		applyItemChanges(armor, [itemEffect({ soak: 1 }, 'q1')]);

		expect(armor.soak).toBe(3);
	});

	// A weapon whose main profile and extra profile hold the qualities given, with an effect per quality.
	const twoProfileWeapon = (main: ContainedItemQuality[], extra: ContainedItemQuality[]) => ({
		baseDamage: 5,
		critical: 3,
		encumbrance: 3,
		qualities: main,
		extraProfiles: [{ baseDamage: 2, critical: 4, qualities: extra }],
	});

	it('counts a quality held by two Weapon Profiles once on each, not twice (CRB pp. 86–89)', () => {
		const weapon = twoProfileWeapon([quality('main', 'Keen', 1)], [quality('extra', 'Keen', 1)]);

		applyItemChanges(weapon, [itemEffect({ baseDamage: 1 }, 'main'), itemEffect({ baseDamage: 1 }, 'extra')]);

		expect([weapon.baseDamage, weapon.extraProfiles[0].baseDamage]).toEqual([6, 3]);
	});

	it('changes only the Weapon Profile that holds a quality, while an attachment changes every profile', () => {
		const weapon = twoProfileWeapon([], [quality('extra', 'Keen', 1)]);

		applyItemChanges(weapon, [itemEffect({ baseDamage: 1 }, 'extra'), itemEffect({ critical: -1 })]);

		expect(weapon).toMatchObject({ baseDamage: 5, critical: 2, extraProfiles: [{ baseDamage: 3, critical: 3 }] });
	});

	it("counts each profile's copy of a quality at its own rank, and the item's own fields once, at the highest", () => {
		const weapon = twoProfileWeapon([quality('main', 'Keen', 1)], [quality('extra', 'Keen', 2)]);

		applyItemChanges(weapon, [
			itemEffect({ baseDamage: 1, encumbrance: -1 }, 'main'),
			itemEffect({ baseDamage: 1, encumbrance: -1 }, 'extra'),
		]);

		expect([weapon.baseDamage, weapon.extraProfiles[0].baseDamage, weapon.encumbrance]).toEqual([6, 4, 1]);
	});

	it("counts nowhere an effect of a quality the item no longer holds, whose deletion hasn't landed", () => {
		const weapon = twoProfileWeapon([], [quality('extra', 'Keen', 1)]);

		applyItemChanges(weapon, [itemEffect({ baseDamage: 1, critical: -1, encumbrance: -1 }, 'deleted')]);

		expect(weapon).toMatchObject({ baseDamage: 5, critical: 3, encumbrance: 3, extraProfiles: [{ baseDamage: 2, critical: 4 }] });
	});

	it('leaves a Critical rating of 0 at 0, which no Advantage triggers, and keeps any other at 1 or more', () => {
		const noCritical = { baseDamage: 5, critical: 0 };
		const critical2 = { baseDamage: 5, critical: 2 };

		applyItemChanges(noCritical, [itemEffect({ critical: -1 })]);
		applyItemChanges(critical2, [itemEffect({ critical: -2 })]);

		expect([noCritical.critical, critical2.critical]).toEqual([0, 1]);
	});
});
