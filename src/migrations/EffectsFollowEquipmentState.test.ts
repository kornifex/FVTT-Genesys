/** @file Tests for the planner of the migration that leaves the effects of equipment to its Equipment State. */

import { describe, expect, it, vi } from 'vitest';

// The planner reads `EquipmentState`, which lives in a data model, which extends a Foundry class.
vi.hoisted(() => {
	vi.stubGlobal('foundry', { abstract: { DataModel: class {} } });
});

import { ActorChanges, ActorSource } from '@/migrations/ActorMigration';
import { effectsFollowEquipmentState } from '@/migrations/4-effects-follow-equipment-state';

type Effect = { _id: string; name: string; disabled: boolean; transfer: boolean };

function effect(_id: string, fields: Partial<Effect> = {}): Effect {
	return { _id, name: 'Padded', disabled: false, transfer: true, ...fields };
}

function item(_id: string, type: string, effects: Effect[]) {
	return { _id, name: `${type} ${_id}`, type, system: {}, effects };
}

function actor(type: string, items: ReturnType<typeof item>[], effects: Effect[] = []): ActorSource {
	return { name: 'Hero', type, system: {}, items, effects };
}

// The actor's source once a plan is applied, as Foundry would apply it.
function applied(source: ActorSource, { itemEffects = {} }: ActorChanges): ActorSource {
	const items = (source.items as ReturnType<typeof item>[]).map((sourceItem) => ({
		...sourceItem,
		effects: sourceItem.effects.map((itemEffect) => ({
			...itemEffect,
			...itemEffects[sourceItem._id]?.find((update) => update._id === itemEffect._id),
		})),
	}));
	return { ...source, items };
}

describe('effectsFollowEquipmentState', () => {
	it("enables the disabled effects of a character's armor, weapon and gear", () => {
		const source = actor('character', [
			item('armor', 'armor', [effect('padded', { disabled: true }), effect('plain')]),
			item('weapon', 'weapon', [effect('keen', { disabled: true })]),
			item('gear', 'gear', [effect('lucky', { disabled: true })]),
		]);

		expect(effectsFollowEquipmentState(source)).toEqual({
			itemEffects: {
				armor: [{ _id: 'padded', disabled: false }],
				weapon: [{ _id: 'keen', disabled: false }],
				gear: [{ _id: 'lucky', disabled: false }],
			},
		});
	});

	it("enables the disabled effects of a vehicle's equipment", () => {
		const source = actor('vehicle', [item('cannon', 'vehicleWeapon', [effect('aimed', { disabled: true })])]);

		expect(effectsFollowEquipmentState(source)).toEqual({ itemEffects: { cannon: [{ _id: 'aimed', disabled: false }] } });
	});

	it('changes nothing when no effect of the equipment is disabled', () => {
		const source = actor('character', [item('armor', 'armor', [effect('plain')])]);

		expect(effectsFollowEquipmentState(source)).toBeUndefined();
	});

	it("leaves the disabled of a talent's effect, of an adversary's equipment effect and of an effect created on the actor", () => {
		expect(
			effectsFollowEquipmentState(
				actor('character', [item('talent', 'talent', [effect('grit', { disabled: true })])], [effect('own', { disabled: true })]),
			),
		).toBeUndefined();
		expect(
			effectsFollowEquipmentState(actor('rival', [item('armor', 'armor', [effect('padded', { disabled: true })])])),
		).toBeUndefined();
	});

	it('leaves the disabled of an equipment effect that does not transfer, which legacy transferral never copied', () => {
		const source = actor('character', [item('armor', 'armor', [effect('aura', { disabled: true, transfer: false })])]);

		expect(effectsFollowEquipmentState(source)).toBeUndefined();
	});

	it('changes nothing on a second run', () => {
		const source = actor('character', [item('armor', 'armor', [effect('padded', { disabled: true })])]);

		expect(effectsFollowEquipmentState(applied(source, effectsFollowEquipmentState(source)!))).toBeUndefined();
	});
});
