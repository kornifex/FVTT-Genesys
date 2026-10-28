/**
 * @file Tests for the planner of the migration that deletes the actor-side copies of item effects.
 */

import { describe, expect, it, vi } from 'vitest';

// The planner reads `EquipmentState`, which lives in a data model, which extends a Foundry class.
vi.hoisted(() => {
	vi.stubGlobal('foundry', { abstract: { DataModel: class {} } });
});

import { ActorChanges, ActorSource } from '@/migrations/ActorMigration';
import { effectsStayOnItems } from '@/migrations/3-effects-stay-on-items';

type Effect = {
	_id: string;
	name: string;
	img: string;
	changes: { key: string; value: string; mode: number }[];
	duration: Record<string, unknown>;
	disabled: boolean;
	origin: string | null;
	transfer: boolean;
};

function effect(_id: string, fields: Partial<Effect> = {}): Effect {
	return {
		_id,
		name: 'Grit',
		img: 'icons/svg/aura.svg',
		changes: [{ key: 'system.wounds.max', value: '1', mode: 2 }],
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

function actor(type: string, items: ReturnType<typeof item>[], effects: Effect[]): ActorSource {
	return { name: 'Hero', type, system: {}, items, effects };
}

// A copy of an item's effect, as legacy transferral made it on the actor.
function copy(_id: string, itemId: string, fields: Partial<Effect> = {}) {
	return effect(_id, { origin: `Actor.hero.Item.${itemId}`, ...fields });
}

// The actor's source once a plan is applied, as Foundry would apply it.
function applied(source: ActorSource, { itemEffects = {}, deletedEffects = [] }: ActorChanges): ActorSource {
	const items = (source.items as ReturnType<typeof item>[]).map((sourceItem) => ({
		...sourceItem,
		effects: sourceItem.effects.map((itemEffect) => ({
			...itemEffect,
			...itemEffects[sourceItem._id]?.find((update) => update._id === itemEffect._id),
		})),
	}));
	return { ...source, items, effects: source.effects.filter((actorEffect) => !deletedEffects.includes(actorEffect._id)) };
}

const plan = effectsStayOnItems(() => {});

describe('effectsStayOnItems', () => {
	it('writes what an edited copy holds onto the effect it was copied from, then deletes the copy', () => {
		const edited = {
			name: 'Grit (edited)',
			img: 'icons/svg/shield.svg',
			changes: [{ key: 'system.wounds.max', value: '2', mode: 2 }],
			duration: { rounds: 3 },
			disabled: true,
		};
		const source = actor('character', [item('talent', 'talent', [effect('base')])], [copy('copy', 'talent', edited)]);

		expect(plan(source)).toEqual({ itemEffects: { talent: [{ _id: 'base', ...edited }] }, deletedEffects: ['copy'] });
	});

	it('only writes the fields a copy changed', () => {
		const source = actor('character', [item('talent', 'talent', [effect('base')])], [copy('copy', 'talent', { name: 'Edited' })]);

		expect(plan(source)).toEqual({ itemEffects: { talent: [{ _id: 'base', name: 'Edited' }] }, deletedEffects: ['copy'] });
	});

	it("pairs an item's copies with its transferred effects by order, whatever the origin's actor", () => {
		const source = actor(
			'character',
			[item('talent', 'talent', [effect('first'), effect('kept', { transfer: false }), effect('second')])],
			[
				copy('copy1', 'talent', { name: 'First' }),
				effect('copy2', { origin: 'Scene.s.Token.t.Actor.other.Item.talent', name: 'Second' }),
			],
		);

		expect(plan(source)).toEqual({
			itemEffects: {
				talent: [
					{ _id: 'first', name: 'First' },
					{ _id: 'second', name: 'Second' },
				],
			},
			deletedEffects: ['copy1', 'copy2'],
		});
	});

	it("leaves the disabled of a copy of a character's or a vehicle's equipment, which the equipment rule wrote", () => {
		for (const [actorType, itemType] of [
			['character', 'armor'],
			['vehicle', 'vehicleWeapon'],
		]) {
			const source = actor(actorType, [item('gear', itemType, [effect('base')])], [copy('copy', 'gear', { disabled: true })]);

			expect(plan(source)).toEqual({ deletedEffects: ['copy'] });
		}
	});

	it("writes the disabled of a copy of an adversary's equipment, which has no Equipment State", () => {
		const source = actor('rival', [item('armor', 'armor', [effect('base')])], [copy('copy', 'armor', { disabled: true })]);

		expect(plan(source)).toEqual({ itemEffects: { armor: [{ _id: 'base', disabled: true }] }, deletedEffects: ['copy'] });
	});

	it("warns, naming the actor and the item, and leaves the item's effects as they are when the counts differ", () => {
		const warn = vi.fn();
		const source = actor(
			'character',
			[item('talent', 'talent', [effect('base')])],
			[copy('copy1', 'talent', { name: 'Edited' }), copy('copy2', 'talent')],
		);

		expect(effectsStayOnItems(warn)(source)).toEqual({ deletedEffects: ['copy1', 'copy2'] });
		expect(warn).toHaveBeenCalledWith('Hero', 'talent talent');
	});

	it('keeps the effects created on the actor', () => {
		const source = actor(
			'character',
			[item('talent', 'talent', [effect('base')])],
			[effect('own'), effect('fromActor', { origin: 'Actor.hero' }), copy('gone', 'deletedItem')],
		);

		expect(plan(source)).toBeUndefined();
	});

	it('changes nothing on a second run', () => {
		const source = actor(
			'character',
			[item('talent', 'talent', [effect('base')]), item('armor', 'armor', [effect('armorBase')])],
			[effect('own'), copy('copy', 'talent', { name: 'Edited' }), copy('armorCopy', 'armor', { disabled: true })],
		);

		expect(plan(applied(source, plan(source)!))).toBeUndefined();
	});
});
