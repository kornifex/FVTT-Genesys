/** @file Tests for the planner of the migration that gives Vicious its effect on the injuries inflicted (CRB p. 89). */

import { describe, expect, it } from 'vitest';

import { viciousThroughItsEffect } from '@/migrations/9-vicious-through-its-effect';
import { ItemChanges, ItemSource } from '@/migrations/ItemMigration';

type Quality = { id: string; name: string; description: string; isRated: boolean; rating: number };

function quality(id: string, name: string, rating = 1): Quality {
	return { id, name, description: '', isRated: true, rating };
}

function weapon(qualities: Quality[], effects: object[] = [], extraProfiles: { name: string; qualities: Quality[] }[] = []): ItemSource {
	return { _id: 'axe', name: 'Axe', type: 'weapon', system: { qualities, extraProfiles }, effects };
}

function inflicting(qualityId: string, value = 10) {
	return {
		name: 'Vicious',
		flags: { genesys: { quality: qualityId } },
		system: { changes: [{ key: 'genesys.critical.inflicted', value, type: 'custom' }] },
	};
}

const viciousEffect = (name: string, qualityId?: string) => ({
	name,
	img: 'icons/svg/aura.svg',
	disabled: false,
	...(qualityId && { flags: { genesys: { quality: qualityId } } }),
	system: { changes: [{ key: 'genesys.critical.inflicted', value: 10, type: 'custom' }] },
});

function newIds() {
	let count = 0;
	return () => `new${++count}`;
}

const plan = (source: ItemSource) => viciousThroughItsEffect(['Vicious', 'Sanguinaire'], newIds())(source);

// The item's source once a plan is applied, as Foundry would apply it.
function applied(source: ItemSource, { update = {}, createdEffects = [] }: ItemChanges): ItemSource {
	const system = { ...source.system };
	for (const [key, value] of Object.entries(update)) {
		system[key.replace(/^system\./, '')] = value;
	}
	return { ...source, system, effects: [...source.effects, ...createdEffects] };
}

describe('viciousThroughItsEffect', () => {
	it("gives each Vicious of a weapon an effect adding 10 to the injuries inflicted, tagged with it, by the English name or the world language's", () => {
		expect(plan(weapon([quality('p', 'Pierce'), quality('v', ' vicious ', 2), quality('s', 'SANGUINAIRE')]))).toEqual({
			createdEffects: [viciousEffect(' vicious ', 'v'), viciousEffect('SANGUINAIRE', 's')],
		});
	});

	it('gives an id to a Vicious stored without one, before tagging its effect with it', () => {
		const source = weapon(
			[quality('', 'Vicious', 2)],
			[],
			[{ name: 'Haft', qualities: [quality('p', 'Pierce'), quality('', 'Vicious')] }],
		);

		expect(plan(source)).toEqual({
			update: {
				'system.qualities': [quality('new1', 'Vicious', 2)],
				'system.extraProfiles': [{ name: 'Haft', qualities: [quality('p', 'Pierce'), quality('new2', 'Vicious')] }],
			},
			createdEffects: [viciousEffect('Vicious', 'new1'), viciousEffect('Vicious', 'new2')],
		});
	});

	it('leaves alone a Vicious whose effect already changes the injuries inflicted, whatever its value', () => {
		expect(plan(weapon([quality('v', 'Vicious', 3)], [inflicting('v', 5)]))).toBeUndefined();
	});

	it("gives an effect to a Vicious whose effects don't change the injuries inflicted, or to a copy that another copy's effect tags", () => {
		const damage = { name: 'Vicious', flags: { genesys: { quality: 'v' } }, system: { changes: [{ key: 'system.damage', value: 1 }] } };

		expect(plan(weapon([quality('v', 'Vicious'), quality('w', 'Vicious')], [damage, inflicting('x')]))).toEqual({
			createdEffects: [viciousEffect('Vicious', 'v'), viciousEffect('Vicious', 'w')],
		});
	});

	it('leaves alone a weapon without Vicious, and an item that holds no weapon qualities', () => {
		expect(plan(weapon([quality('p', 'Pierce')]))).toBeUndefined();
		expect(plan({ _id: 'g', name: 'Vicious', type: 'gear', system: {}, effects: [] })).toBeUndefined();
		expect(plan({ _id: 't', name: 'Vicious', type: 'talent', system: {}, effects: [] })).toBeUndefined();
	});

	it('gives a vehicle weapon its Vicious effect too', () => {
		const source = { ...weapon([quality('v', 'Vicious')]), type: 'vehicleWeapon' };

		expect(plan(source)).toEqual({ createdEffects: [viciousEffect('Vicious', 'v')] });
	});

	it('gives a quality item named Vicious its effect, untagged, so that dropping it on a weapon copies it', () => {
		const vicious = { _id: 'q', name: 'Sanguinaire', type: 'quality', system: { isRated: true }, effects: [] };

		expect(plan(vicious)).toEqual({ createdEffects: [viciousEffect('Sanguinaire')] });
		expect(
			plan({ ...vicious, effects: [{ system: { changes: [{ key: 'genesys.critical.inflicted', value: 20 }] } }] }),
		).toBeUndefined();
		expect(plan({ ...vicious, name: 'Pierce' })).toBeUndefined();
	});

	it('changes nothing when it runs again on what it migrated', () => {
		const source = weapon([quality('', 'Vicious', 2)], [], [{ name: 'Haft', qualities: [quality('', 'Sanguinaire')] }]);
		const migrated = applied(source, plan(source)!);

		expect(plan(migrated)).toBeUndefined();
	});
});
