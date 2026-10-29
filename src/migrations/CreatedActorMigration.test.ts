/** @file Tests for the migrations an actor gets when it is created. */

import { describe, expect, it } from 'vitest';

import { ActorSource } from '@/migrations/ActorMigration';
import { effectsStayOnItems } from '@/migrations/3-effects-stay-on-items';
import { createdActorMigration } from '@/migrations/CreatedActorMigration';

type Effect = {
	_id: string;
	name: string;
	img: string;
	changes: unknown[];
	duration: Record<string, unknown>;
	disabled: boolean;
	origin: string | null;
	transfer: boolean;
};

function effect(_id: string, fields: Partial<Effect> = {}): Effect {
	return {
		_id,
		name: 'Padded',
		img: 'icons/svg/aura.svg',
		changes: [],
		duration: {},
		disabled: false,
		origin: null,
		transfer: true,
		...fields,
	};
}

function item(_id: string, type: string, effects: Effect[]) {
	return { _id, name: `${type} ${_id}`, type, system: {}, effects };
}

function actor(items: ReturnType<typeof item>[], effects: Effect[] = []): ActorSource {
	return { name: 'Hero', type: 'character', system: {}, items, effects };
}

// A copy of an item's effect, as legacy transferral made it on the actor.
function copy(_id: string, itemId: string, fields: Partial<Effect> = {}) {
	return effect(_id, { origin: `Actor.hero.Item.${itemId}`, ...fields });
}

const migrate = createdActorMigration(effectsStayOnItems(() => {}));

describe('createdActorMigration', () => {
	it("deletes the legacy copies and enables the disabled effects of the equipment, an edited copy's fields kept", () => {
		const source = actor(
			[item('armor', 'armor', [effect('padded', { disabled: true })]), item('talent', 'talent', [effect('grit')])],
			[copy('armorCopy', 'armor', { name: 'Padded (edited)' }), copy('talentCopy', 'talent')],
		);

		expect(migrate(source)).toEqual({
			itemEffects: { armor: [{ _id: 'padded', name: 'Padded (edited)', disabled: false }] },
			deletedEffects: ['armorCopy', 'talentCopy'],
		});
	});

	it('enables the disabled effects of the equipment of an actor whose only copies are of a talent', () => {
		const source = actor(
			[item('armor', 'armor', [effect('padded', { disabled: true })]), item('talent', 'talent', [effect('grit')])],
			[copy('talentCopy', 'talent')],
		);

		expect(migrate(source)).toEqual({
			itemEffects: { armor: [{ _id: 'padded', disabled: false }] },
			deletedEffects: ['talentCopy'],
		});
	});

	it('keeps the disabled effects of the equipment of an actor without legacy copies, as a duplicate of a migrated actor', () => {
		const source = actor([item('armor', 'armor', [effect('padded', { disabled: true })])], [effect('own')]);

		expect(migrate(source)).toBeUndefined();
	});
});
