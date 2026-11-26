import { describe, expect, it } from 'vitest';

import { isForWeaponAttacksOnly, offersWeaponAttacksOnly } from '@/effects/WeaponAttacksOnly';

describe('offersWeaponAttacksOnly', () => {
	const item = (type: string) => ({ documentName: 'Item', type });
	const own = {};

	it("offers the option on a weapon's own effect", () => {
		expect(offersWeaponAttacksOnly(own, item('weapon'))).toBe(true);
	});

	it('leaves it out of the effects a quality or an attachment brought, which count for the attacks already', () => {
		expect(offersWeaponAttacksOnly({ flags: { genesys: { quality: 'q1' } } }, item('weapon'))).toBe(false);
		expect(offersWeaponAttacksOnly({ flags: { genesys: { attachment: 'm1' } } }, item('weapon'))).toBe(false);
	});

	it("leaves it out of another item type's effects and of an actor's", () => {
		expect(offersWeaponAttacksOnly(own, item('vehicleWeapon'))).toBe(false);
		expect(offersWeaponAttacksOnly(own, item('armor'))).toBe(false);
		expect(offersWeaponAttacksOnly(own, item('attachment'))).toBe(false);
		expect(offersWeaponAttacksOnly(own, { documentName: 'Actor', type: 'character' })).toBe(false);
		expect(offersWeaponAttacksOnly(own, null)).toBe(false);
	});
});

describe('isForWeaponAttacksOnly', () => {
	const weapon = { type: 'weapon' };
	const marked = { flags: { genesys: { weaponAttacksOnly: true } } };

	it("reads the option of a weapon's effect, off when the effect has never had it", () => {
		expect(isForWeaponAttacksOnly(marked, weapon)).toBe(true);
		expect(isForWeaponAttacksOnly({ flags: { genesys: { weaponAttacksOnly: false } } }, weapon)).toBe(false);
		expect(isForWeaponAttacksOnly({}, weapon)).toBe(false);
	});

	it('ignores it on the effect of another item, or of none', () => {
		expect(isForWeaponAttacksOnly(marked, { type: 'talent' })).toBe(false);
		expect(isForWeaponAttacksOnly(marked, undefined)).toBe(false);
	});
});
