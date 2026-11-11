/**
 * @file Tests for the Pool Modifications that come from effects.
 */

import { describe, expect, it } from 'vitest';

import { vehicleDefense } from '@/actor/data/Protection';
import { Characteristic } from '@/data/Characteristics';
import {
	decodeKey,
	EditedChange,
	encodeKey,
	fromEditedChange,
	isPoolModificationValue,
	PoolModificationActor,
	PoolModificationEffect,
	poolModificationsForCheck,
	scaledChangeValue,
	skillChoices,
	SourceItem,
	sourceItem,
	subjectFieldForKey,
	toEditedChange,
} from '@/effects/PoolModifications';
import type { EquipmentDamageState } from '@/item/data/EquipmentDamage';

type Change = { key: string; value: string };

function talent(rank: number, scalesWithRank: 'yes' | 'no' = 'no') {
	return {
		documentName: 'Item',
		id: 'talentId',
		name: 'Talent',
		uuid: 'Actor.actorId.Item.talentId',
		type: 'talent',
		system: { rank, scalesWithRank },
	};
}

function effect(
	changes: Change[],
	{
		name = 'Effect',
		isSuppressed = false,
		origin = null,
		parent = null,
	}: { name?: string; isSuppressed?: boolean; origin?: string | null; parent?: unknown } = {},
): PoolModificationEffect {
	return { name, uuid: `ActiveEffect.${name}`, isSuppressed, origin, parent, changes };
}

/**
 * An actor whose applicable effects are the given ones.
 */
function actor(
	type: string,
	effects: PoolModificationEffect[],
	{ totalDefense = { melee: 0, ranged: 0 }, silhouette = 1 } = {},
): PoolModificationActor {
	return {
		type,
		system: { totalDefense, silhouette },
		allApplicableEffects: () => effects,
	};
}

/**
 * An actor holding one item, with an effect copied onto the actor from that item, as legacy transferral does.
 */
function actorWithCopiedEffect(item: SourceItem, changes: Change[]) {
	const parent = { documentName: 'Actor', items: new Map([['talentId', item]]) };
	return actor('character', [effect(changes, { origin: 'Actor.actorId.Item.talentId', parent })]);
}

describe('change keys', () => {
	it('encodes a key, with an empty subject for every check', () => {
		expect(encodeKey({ kind: 'check', source: 'self', subject: 'ignored' })).toBe('genesys.pool.check.self.');
		expect(encodeKey({ kind: 'char', source: 'target', subject: 'brawn' })).toBe('genesys.pool.char.target.brawn');
		expect(encodeKey({ kind: 'skill', source: 'self', subject: 'Ranged (Light)' })).toBe('genesys.pool.skill.self.Ranged (Light)');
	});

	it('encodes the keys of combat checks and of melee or ranged attacks with an empty subject', () => {
		expect(encodeKey({ kind: 'combat', source: 'self', subject: 'ignored' })).toBe('genesys.pool.combat.self.');
		expect(encodeKey({ kind: 'melee', source: 'target', subject: '' })).toBe('genesys.pool.melee.target.');
		expect(encodeKey({ kind: 'ranged', source: 'target', subject: '' })).toBe('genesys.pool.ranged.target.');
	});

	it('decodes the keys it encodes', () => {
		for (const key of [
			{ kind: 'check', source: 'self', subject: '' },
			{ kind: 'char', source: 'target', subject: 'brawn' },
			{ kind: 'skill', source: 'self', subject: 'Ranged (Light)' },
			{ kind: 'combat', source: 'self', subject: '' },
			{ kind: 'melee', source: 'target', subject: '' },
			{ kind: 'ranged', source: 'target', subject: '' },
		] as const) {
			expect(decodeKey(encodeKey(key))).toEqual(key);
		}
	});

	it("doesn't decode the keys of other changes", () => {
		expect(decodeKey('system.soak')).toBeUndefined();
		expect(decodeKey('genesys.pool.check.self')).toBeUndefined();
		expect(decodeKey('genesys.pool.other.self.')).toBeUndefined();
	});
});

describe('isPoolModificationValue', () => {
	it('accepts glyphs only', () => {
		expect(isPoolModificationValue('')).toBe(true);
		expect(isPoolModificationValue('BB-S^a')).toBe(true);
		expect(isPoolModificationValue('2')).toBe(false);
		expect(isPoolModificationValue('B x')).toBe(false);
	});

	it('refuses a glyph in the wrong case', () => {
		expect(isPoolModificationValue('p')).toBe(false);
		expect(isPoolModificationValue('T')).toBe(false);
		expect(isPoolModificationValue('Pp')).toBe(false);
	});
});

describe('sourceItem', () => {
	it('is the parent of an effect that lives on an item', () => {
		const item = talent(1);
		expect(sourceItem(effect([], { parent: item }))).toBe(item);
	});

	it('is the item of its actor that the origin of an effect living on an actor points to', () => {
		const item = talent(1);
		const parent = { documentName: 'Actor', items: new Map([['talentId', item]]) };
		expect(sourceItem(effect([], { parent, origin: 'Actor.actorId.Item.talentId' }))).toBe(item);
		expect(sourceItem(effect([], { parent, origin: 'Scene.sceneId.Token.tokenId.Actor.actorId.Item.talentId' }))).toBe(item);
	});

	it('is nothing for an effect living on an actor without an item origin', () => {
		const parent = { documentName: 'Actor', items: new Map([['talentId', talent(1)]]) };
		expect(sourceItem(effect([], { parent, origin: null }))).toBeUndefined();
		expect(sourceItem(effect([], { parent, origin: 'Actor.actorId' }))).toBeUndefined();
		expect(sourceItem(effect([], { parent, origin: 'Actor.actorId.Item.otherId' }))).toBeUndefined();
	});
});

describe('scaledChangeValue', () => {
	it('repeats a Pool Modification once per rank of a talent that scales with rank', () => {
		expect(scaledChangeValue(talent(3, 'yes'), { key: 'genesys.pool.check.self.', value: 'B' })).toBe('BBB');
	});

	it("doesn't repeat a Pool Modification of a talent that doesn't scale with rank, or of another item", () => {
		expect(scaledChangeValue(talent(3, 'no'), { key: 'genesys.pool.check.self.', value: 'B' })).toBe('B');
		expect(scaledChangeValue({ type: 'gear', system: {} }, { key: 'genesys.pool.check.self.', value: 'B' })).toBe('B');
		expect(scaledChangeValue(undefined, { key: 'genesys.pool.check.self.', value: 'B' })).toBe('B');
	});

	it('multiplies a numeric change by the rank of any talent', () => {
		expect(scaledChangeValue(talent(3, 'no'), { key: 'system.soak', value: '1' })).toBe('3');
		expect(scaledChangeValue(talent(3, 'yes'), { key: 'system.soak', value: '2' })).toBe('6');
	});

	it("counts Defensive Driving's Piloted Vehicle Defense once per rank (CRB p. 80)", () => {
		expect(scaledChangeValue(talent(2), { key: 'system.pilotedVehicleDefense', value: '1' })).toBe('2');
		expect(scaledChangeValue(talent(2), { key: 'system.pilotedVehicleDefense', value: 1 })).toBe(2);
	});

	it('multiplies a change whose value Foundry v14 stores as a number, keeping it a number', () => {
		expect(scaledChangeValue(talent(3), { key: 'system.soak', value: 2 })).toBe(6);
	});

	it("doesn't scale a numeric change of another item, or a change that isn't a number", () => {
		expect(scaledChangeValue({ type: 'gear', system: {} }, { key: 'system.soak', value: '1' })).toBe('1');
		expect(scaledChangeValue(undefined, { key: 'system.soak', value: '1' })).toBe('1');
		expect(scaledChangeValue(talent(3), { key: 'system.notes', value: 'text' })).toBe('text');
		expect(scaledChangeValue({ type: 'gear', system: {} }, { key: 'system.soak', value: 2 })).toBe(2);
		expect(scaledChangeValue(talent(3), { key: 'system.notes', value: null })).toBeNull();
	});
});

describe('poolModificationsForCheck', () => {
	const check = { characteristic: Characteristic.Agility, skillName: 'Stealth' };

	it('collects the changes of the actor that apply to every check, to the characteristic and to the skill', () => {
		const self = actor('character', [
			effect(
				[
					{ key: 'genesys.pool.check.self.', value: 'B' },
					{ key: 'genesys.pool.char.self.agility', value: 'A' },
					{ key: 'genesys.pool.skill.self.Stealth', value: '^' },
					{ key: 'genesys.pool.char.self.brawn', value: 'P' },
					{ key: 'genesys.pool.skill.self.Athletics', value: 'P' },
					{ key: 'genesys.pool.check.target.', value: 'S' },
					{ key: 'system.soak', value: '1' },
				],
				{ name: 'Talent' },
			),
		]);

		expect(poolModificationsForCheck(self, undefined, check)).toEqual([
			{ source: 'self', from: { effect: 'Talent', uuid: 'ActiveEffect.Talent' }, mods: ['B', 'A', '^'] },
		]);
	});

	it('collects the changes of a skill whatever the case of its name', () => {
		const self = actor('character', [effect([{ key: 'genesys.pool.skill.self.Ranged (Light)', value: 'B' }], { name: 'Talent' })]);

		expect(poolModificationsForCheck(self, undefined, { characteristic: Characteristic.Agility, skillName: 'Ranged (light)' })).toEqual(
			[{ source: 'self', from: { effect: 'Talent', uuid: 'ActiveEffect.Talent' }, mods: ['B'] }],
		);
	});

	it('only collects the changes for every check without a characteristic or a skill', () => {
		const self = actor('character', [
			effect([
				{ key: 'genesys.pool.check.self.', value: 'B' },
				{ key: 'genesys.pool.char.self.agility', value: 'A' },
			]),
		]);

		expect(poolModificationsForCheck(self, undefined, {})[0].mods).toEqual(['B']);
	});

	describe("the changes of the actor's combat checks (CRB p. 101)", () => {
		const aiming = actor('character', [effect([{ key: 'genesys.pool.combat.self.', value: 'B' }], { name: 'Aim' })]);

		it('applies to an attack, melee or ranged', () => {
			for (const attackRange of ['engaged', 'short', 'extreme']) {
				expect(poolModificationsForCheck(aiming, undefined, { ...check, attackRange })).toEqual([
					{ source: 'self', from: { effect: 'Aim', uuid: 'ActiveEffect.Aim' }, mods: ['B'] },
				]);
			}
		});

		it('is left out of a check that is no attack, as a Stealth or a Characteristic Check (CRB p. 98)', () => {
			expect(poolModificationsForCheck(aiming, undefined, check)).toEqual([]);
			expect(poolModificationsForCheck(aiming, undefined, { characteristic: Characteristic.Agility })).toEqual([]);
			expect(poolModificationsForCheck(aiming, undefined, {})).toEqual([]);
		});

		it("is left out of the attacks against the actor: only the actor's own checks get it", () => {
			expect(poolModificationsForCheck(actor('rival', []), aiming, { attackRange: 'short' })).toEqual([]);
		});
	});

	describe('the changes of the attacks that target the actor, melee or ranged (CRB p. 100, 108)', () => {
		const self = actor('character', []);
		const prone = actor('character', [
			effect(
				[
					{ key: 'genesys.pool.ranged.target.', value: 'S' },
					{ key: 'genesys.pool.melee.target.', value: 'B' },
				],
				{ name: 'Prone' },
			),
		]);
		const fromProne = (mods: string[]) => [{ source: 'target', from: { effect: 'Prone', uuid: 'ActiveEffect.Prone' }, mods }];

		it('applies the melee change to an attack at engaged range, the ranged change to an attack at any other range', () => {
			expect(poolModificationsForCheck(self, prone, { attackRange: 'engaged' })).toEqual(fromProne(['B']));
			for (const attackRange of ['short', 'medium', 'long', 'extreme']) {
				expect(poolModificationsForCheck(self, prone, { attackRange })).toEqual(fromProne(['S']));
			}
		});

		it('applies to no check that is no attack', () => {
			expect(poolModificationsForCheck(self, prone, check)).toEqual([]);
		});

		it("applies to no check of the actor's own", () => {
			expect(poolModificationsForCheck(prone, undefined, { attackRange: 'engaged' })).toEqual([]);
			expect(poolModificationsForCheck(prone, undefined, { attackRange: 'short' })).toEqual([]);
		});
	});

	it('leaves out suppressed effects and effects without a relevant change', () => {
		const self = actor('character', [
			effect([{ key: 'genesys.pool.check.self.', value: 'B' }], { isSuppressed: true }),
			effect([{ key: 'system.soak', value: '1' }]),
		]);

		expect(poolModificationsForCheck(self, undefined, check)).toEqual([]);
	});

	it('scales the changes with the rank of the talent the effect comes from', () => {
		const scaling = actorWithCopiedEffect(talent(2, 'yes'), [{ key: 'genesys.pool.check.self.', value: 'B' }]);
		const notScaling = actorWithCopiedEffect(talent(2, 'no'), [{ key: 'genesys.pool.check.self.', value: 'B' }]);
		const onItem = actor('character', [effect([{ key: 'genesys.pool.check.self.', value: 'B' }], { parent: talent(3, 'yes') })]);

		expect(poolModificationsForCheck(scaling, undefined, check)[0].mods).toEqual(['B', 'B']);
		expect(poolModificationsForCheck(notScaling, undefined, check)[0].mods).toEqual(['B']);
		expect(poolModificationsForCheck(onItem, undefined, check)[0].mods).toEqual(['B', 'B', 'B']);
	});

	it('carries the item an effect comes from, whether the effect lives on it or was copied onto the actor', () => {
		const change = { key: 'genesys.pool.check.self.', value: 'B' };
		const item = { name: 'Talent', uuid: 'Actor.actorId.Item.talentId' };

		expect(poolModificationsForCheck(actorWithCopiedEffect(talent(1), [change]), undefined, check)[0].from).toEqual({
			effect: 'Effect',
			uuid: 'ActiveEffect.Effect',
			item,
		});
		expect(
			poolModificationsForCheck(actor('character', [effect([change], { name: 'Fate', parent: talent(1) })]), undefined, check)[0]
				.from,
		).toEqual({ effect: 'Fate', uuid: 'ActiveEffect.Fate', item });
	});

	it("collects the target's changes for checks that target it, after the actor's", () => {
		const self = actor('character', [effect([{ key: 'genesys.pool.check.self.', value: 'B' }], { name: 'Mine' })]);
		const target = actor('rival', [
			effect(
				[
					{ key: 'genesys.pool.check.target.', value: 'S' },
					{ key: 'genesys.pool.skill.target.Stealth', value: 'D' },
					{ key: 'genesys.pool.check.self.', value: 'P' },
				],
				{ name: 'Theirs' },
			),
		]);

		expect(poolModificationsForCheck(self, target, check)).toEqual([
			{ source: 'self', from: { effect: 'Mine', uuid: 'ActiveEffect.Mine' }, mods: ['B'] },
			{ source: 'target', from: { effect: 'Theirs', uuid: 'ActiveEffect.Theirs' }, mods: ['S', 'D'] },
		]);
	});

	it("adds one Setback per point of the target's defense (CRB p. 104): melee defense against a weapon of engaged range, ranged defense against the others", () => {
		const self = actor('character', []);
		const character = actor('character', [], { totalDefense: { melee: 1, ranged: 2 } });
		const adversary = actor('nemesis', [], { totalDefense: { melee: 0, ranged: 1 } });

		expect(poolModificationsForCheck(self, character, { attackRange: 'engaged' })).toEqual([
			{ source: 'target', from: { defense: 'melee' }, mods: ['S'] },
		]);
		expect(poolModificationsForCheck(self, character, { attackRange: 'long' })).toEqual([
			{ source: 'target', from: { defense: 'ranged' }, mods: ['S', 'S'] },
		]);
		expect(poolModificationsForCheck(self, adversary, { attackRange: 'long' })).toEqual([
			{ source: 'target', from: { defense: 'ranged' }, mods: ['S'] },
		]);
		expect(
			poolModificationsForCheck(self, actor('rival', [], { totalDefense: { melee: 0, ranged: 2 } }), { attackRange: 'medium' }),
		).toEqual([{ source: 'target', from: { defense: 'ranged' }, mods: ['S', 'S'] }]);
		expect(poolModificationsForCheck(self, character, {})).toEqual([]);
	});

	it("leaves out the target's defense when it is 0 against the attack (CRB p. 104)", () => {
		const self = actor('character', []);
		const adversary = actor('nemesis', [], { totalDefense: { melee: 0, ranged: 1 } });

		expect(poolModificationsForCheck(self, adversary, { attackRange: 'engaged' })).toEqual([]);
		expect(poolModificationsForCheck(self, actor('rival', []), { attackRange: 'medium' })).toEqual([]);
	});

	it("collects a targeted vehicle's changes, and adds one Setback per point of its defense at any range (CRB p. 223, 104)", () => {
		const self = actor('character', []);
		const vehicle = actor('vehicle', [effect([{ key: 'genesys.pool.check.target.', value: 'D' }], { name: 'Smoke' })], {
			totalDefense: vehicleDefense(2, 0),
		});

		expect(poolModificationsForCheck(self, vehicle, {})).toEqual([
			{ source: 'target', from: { effect: 'Smoke', uuid: 'ActiveEffect.Smoke' }, mods: ['D'] },
		]);
		expect(poolModificationsForCheck(self, vehicle, { attackRange: 'medium' })).toContainEqual({
			source: 'target',
			from: { defense: 'ranged' },
			mods: ['S', 'S'],
		});
		expect(poolModificationsForCheck(self, vehicle, { attackRange: 'engaged' })).toContainEqual({
			source: 'target',
			from: { defense: 'melee' },
			mods: ['S', 'S'],
		});
	});

	it("counts a targeted vehicle's defense up to 4, and leaves it out at 0 (CRB p. 223, 104)", () => {
		const self = actor('character', []);

		expect(
			poolModificationsForCheck(self, actor('vehicle', [], { totalDefense: vehicleDefense(0, 0) }), { attackRange: 'long' }),
		).toEqual([]);
		expect(
			poolModificationsForCheck(self, actor('vehicle', [], { totalDefense: vehicleDefense(5, 0) }), { attackRange: 'short' }),
		).toEqual([{ source: 'target', from: { defense: 'ranged' }, mods: ['S', 'S', 'S', 'S'] }]);
	});

	describe('the silhouette difference between the attacker and the target (CRB p. 109)', () => {
		const sized = (type: string, silhouette: number) => actor(type, [], { silhouette });

		it('removes one Difficulty die from an attack against a target 2 or more silhouettes larger', () => {
			const self = sized('character', 1);

			expect(poolModificationsForCheck(self, sized('rival', 3), { attacker: self })).toEqual([
				{ source: 'target', from: { silhouette: { target: 3, attacker: 1 } }, mods: ['-D'] },
			]);
		});

		it('adds one Difficulty die to an attack against a target 2 or more silhouettes smaller', () => {
			const self = sized('nemesis', 4);

			expect(poolModificationsForCheck(self, sized('character', 0), { attacker: self })).toEqual([
				{ source: 'target', from: { silhouette: { target: 0, attacker: 4 } }, mods: ['D'] },
			]);
		});

		it('changes nothing when the silhouettes differ by 1 or less', () => {
			const self = sized('character', 2);

			for (const silhouette of [1, 2, 3]) {
				expect(poolModificationsForCheck(self, sized('rival', silhouette), { attacker: self })).toEqual([]);
			}
		});

		it('compares the silhouette of a vehicle, as the attacker or the target (CRB p. 222)', () => {
			const self = sized('character', 1);
			const vehicle = sized('vehicle', 3);

			expect(poolModificationsForCheck(self, vehicle, { attacker: self })[0].mods).toEqual(['-D']);
			expect(poolModificationsForCheck(self, sized('character', 1), { attacker: vehicle })).toEqual([
				{ source: 'target', from: { silhouette: { target: 1, attacker: 3 } }, mods: ['D'] },
			]);
		});

		it('changes nothing against a vehicle whose silhouette was emptied in its sheet', () => {
			const self = sized('character', 4);
			const vehicle: PoolModificationActor = { type: 'vehicle', system: { silhouette: null }, allApplicableEffects: () => [] };

			expect(poolModificationsForCheck(self, vehicle, { attacker: self })).toEqual([]);
		});

		it("lists the silhouette difference after the target's defense", () => {
			const self = sized('character', 1);
			const target = actor('rival', [], { silhouette: 3, totalDefense: { melee: 1, ranged: 0 } });

			expect(poolModificationsForCheck(self, target, { attackRange: 'engaged', attacker: self }).map(({ from }) => from)).toEqual([
				{ defense: 'melee' },
				{ silhouette: { target: 3, attacker: 1 } },
			]);
		});

		it("changes nothing for a check that isn't an attack, or without a target", () => {
			const self = sized('character', 1);

			expect(poolModificationsForCheck(self, sized('rival', 3), {})).toEqual([]);
			expect(poolModificationsForCheck(self, undefined, { attacker: self })).toEqual([]);
		});
	});

	describe("a character's encumbrance over their threshold (CRB p. 85)", () => {
		const encumbered = (value: number, threshold: number, type = 'character'): PoolModificationActor => ({
			type,
			system: { currentEncumbrance: { value, threshold } },
			allApplicableEffects: () => [],
		});

		it('adds one Setback per point over the threshold to Agility and Brawn checks', () => {
			for (const characteristic of [Characteristic.Agility, Characteristic.Brawn]) {
				expect(poolModificationsForCheck(encumbered(8, 6), undefined, { characteristic, skillName: 'Athletics' })).toEqual([
					{ source: 'self', from: { encumbrance: { value: 8, threshold: 6 } }, mods: ['S', 'S'] },
				]);
			}
		});

		it('changes nothing for the checks of the other characteristics, or without one', () => {
			for (const characteristic of [
				Characteristic.Intellect,
				Characteristic.Cunning,
				Characteristic.Willpower,
				Characteristic.Presence,
			]) {
				expect(poolModificationsForCheck(encumbered(8, 6), undefined, { characteristic })).toEqual([]);
			}
			expect(poolModificationsForCheck(encumbered(8, 6), undefined, {})).toEqual([]);
		});

		it('changes nothing at the threshold or under it', () => {
			for (const value of [5, 6]) {
				expect(poolModificationsForCheck(encumbered(value, 6), undefined, { characteristic: Characteristic.Brawn })).toEqual([]);
			}
		});

		it('only hinders a character, the only actor with a threshold', () => {
			for (const type of ['minion', 'rival', 'nemesis', 'vehicle']) {
				expect(poolModificationsForCheck(encumbered(8, 6, type), undefined, { characteristic: Characteristic.Agility })).toEqual(
					[],
				);
			}
		});

		it("lists the encumbrance after the character's own effects, before the target's", () => {
			const self: PoolModificationActor = {
				...encumbered(7, 6),
				allApplicableEffects: () => [effect([{ key: 'genesys.pool.check.self.', value: 'B' }], { name: 'Own' })],
			};
			const target = actor('rival', [effect([{ key: 'genesys.pool.check.target.', value: 'S' }], { name: 'Target' })]);

			expect(poolModificationsForCheck(self, target, { characteristic: Characteristic.Agility }).map(({ from }) => from)).toEqual([
				{ effect: 'Own', uuid: 'ActiveEffect.Own' },
				{ encumbrance: { value: 7, threshold: 6 } },
				{ effect: 'Target', uuid: 'ActiveEffect.Target' },
			]);
		});
	});

	describe('the damage of the weapon an attack is made with (CRB p. 89, Table I.5-4)', () => {
		const weapon = (damage: EquipmentDamageState) => ({ name: 'Pistol', uuid: 'Item.pistol', system: { damage } });
		const self = actor('character', []);

		it('adds a Setback at minor damage', () => {
			expect(poolModificationsForCheck(self, undefined, { weapon: weapon('minor') })).toEqual([
				{ source: 'self', from: { itemDamage: { name: 'Pistol', uuid: 'Item.pistol', damage: 'minor' } }, mods: ['S'] },
			]);
		});

		it('adds one Difficulty die at moderate damage', () => {
			expect(poolModificationsForCheck(self, undefined, { weapon: weapon('moderate') })).toEqual([
				{ source: 'self', from: { itemDamage: { name: 'Pistol', uuid: 'Item.pistol', damage: 'moderate' } }, mods: ['D'] },
			]);
		});

		it('changes nothing for an undamaged weapon, or a check made without one', () => {
			expect(poolModificationsForCheck(self, undefined, { weapon: weapon('undamaged') })).toEqual([]);
			expect(poolModificationsForCheck(self, undefined, {})).toEqual([]);
		});
	});

	it('collects nothing without an actor making the check', () => {
		expect(
			poolModificationsForCheck(undefined, actor('rival', [effect([{ key: 'genesys.pool.check.target.', value: 'S' }])]), {}),
		).toEqual([]);
	});
});

/**
 * A change as Foundry stores it, with the extra fields the effect sheets edit.
 */
function editedChange(
	key: string,
	value: string,
	{ mode = 0, char = undefined as string | undefined, skill = undefined as string | undefined } = {},
) {
	const change = { key, value, mode, priority: 0 } as EditedChange;
	if (char !== undefined) {
		change.char = char;
	}
	if (skill !== undefined) {
		change.skill = skill;
	}
	return change;
}

// v13: Foundry's custom effect mode, which an edited Pool Modification gets.
const customMode = () => 0;

describe('editing changes in the effect sheets', () => {
	it('splits the subject of a Pool Modification off its key', () => {
		const change = editedChange('genesys.pool.skill.target.Stealth', 'S');

		expect(toEditedChange(change)).toEqual(editedChange('genesys.pool.skill.target', 'S', { skill: 'Stealth' }));
		expect(toEditedChange(editedChange('genesys.pool.char.self.brawn', 'S'))).toEqual(
			editedChange('genesys.pool.char.self', 'S', { char: 'brawn' }),
		);
		expect(toEditedChange(editedChange('genesys.pool.check.self.', 'S'))).toEqual(editedChange('genesys.pool.check.self', 'S'));
		expect(change.key).toBe('genesys.pool.skill.target.Stealth');
	});

	it('leaves other changes as they are', () => {
		expect(toEditedChange(editedChange('system.soak', '1', { mode: 2 }))).toEqual(editedChange('system.soak', '1', { mode: 2 }));
		expect(fromEditedChange(editedChange('system.soak', '1', { mode: 2, char: 'brawn' }), customMode)).toEqual(
			editedChange('system.soak', '1', { mode: 2, char: 'brawn' }),
		);
	});

	it('puts the subject back into the key of a Pool Modification', () => {
		const subjects = { mode: 2, skill: 'Stealth', char: 'brawn' };

		expect(fromEditedChange(editedChange('genesys.pool.skill.target', 'S', subjects), customMode)).toEqual(
			editedChange('genesys.pool.skill.target.Stealth', 'S'),
		);
		expect(fromEditedChange(editedChange('genesys.pool.char.self', 'S', subjects), customMode).key).toBe(
			'genesys.pool.char.self.brawn',
		);
		expect(fromEditedChange(editedChange('genesys.pool.check.self', 'S', subjects), customMode).key).toBe('genesys.pool.check.self.');
	});

	it('round-trips every kind of key', () => {
		for (const key of [
			'genesys.pool.check.self.',
			'genesys.pool.char.target.cunning',
			'genesys.pool.skill.self.Cool',
			'genesys.pool.combat.self.',
			'genesys.pool.melee.target.',
			'genesys.pool.ranged.target.',
		]) {
			expect(fromEditedChange(toEditedChange(editedChange(key, 'B')), customMode).key).toBe(key);
		}
	});

	it('empties the value of a Pool Modification unless it only holds glyphs', () => {
		expect(fromEditedChange(editedChange('genesys.pool.check.self', '2'), customMode).value).toBe('');
		expect(fromEditedChange(editedChange('genesys.pool.check.self', 'BB'), customMode).value).toBe('BB');
	});

	it('leaves the edited change as it is', () => {
		const change = editedChange('genesys.pool.skill.target', '2', { mode: 2, skill: 'Stealth' });
		fromEditedChange(change, customMode);

		expect(change).toEqual(editedChange('genesys.pool.skill.target', '2', { mode: 2, skill: 'Stealth' }));
	});

	it('offers the skills of the Skills Compendium and those the changes apply to', () => {
		const changes = [
			editedChange('genesys.pool.skill.self', 'B', { skill: 'Piloting (Space)' }),
			editedChange('genesys.pool.skill.target', 'S', { skill: 'Cool' }),
			editedChange('genesys.pool.char.self', 'B', { char: 'brawn' }),
			editedChange('genesys.pool.skill.self', 'B', { skill: '' }),
		];

		expect(skillChoices(['Cool', 'Athletics'], changes)).toEqual({
			Cool: 'Cool',
			Athletics: 'Athletics',
			'Piloting (Space)': 'Piloting (Space)',
		});
		expect(skillChoices([], changes)).toEqual({ 'Piloting (Space)': 'Piloting (Space)', Cool: 'Cool' });
	});

	it("offers a skill once, with the case the changes apply to, when it differs from the Skills Compendium's", () => {
		const changes = [editedChange('genesys.pool.skill.self', 'B', { skill: 'ranged (light)' })];

		expect(skillChoices(['Cool', 'Ranged (Light)'], changes)).toEqual({ Cool: 'Cool', 'ranged (light)': 'ranged (light)' });
	});

	it('names the field that edits what a picked key applies to', () => {
		expect(subjectFieldForKey('genesys.pool.check.self')).toBe('check-selection');
		expect(subjectFieldForKey('genesys.pool.char.target')).toBe('characteristic-selection');
		expect(subjectFieldForKey('genesys.pool.skill.self')).toBe('skill-selection');
		for (const key of ['genesys.pool.combat.self', 'genesys.pool.melee.target', 'genesys.pool.ranged.target']) {
			expect(subjectFieldForKey(key)).toBe('check-selection');
		}
		expect(subjectFieldForKey('system.soak')).toBe('effect-mode');
	});
});

/**
 * A change as Foundry v14 stores it in `system.changes`, with the extra fields the effect sheets edit.
 */
function v14EditedChange(
	key: string,
	value: unknown,
	{ type = 'custom', char = undefined as string | undefined, skill = undefined as string | undefined } = {},
) {
	const change = { key, value, type, phase: 'initial', priority: null } as EditedChange;
	if (char !== undefined) {
		change.char = char;
	}
	if (skill !== undefined) {
		change.skill = skill;
	}
	return change;
}

describe('editing changes in the effect sheets on Foundry v14', () => {
	// v14 logs a deprecation warning when the custom mode is read, so a v14 change never reads it.
	const unreadMode = () => {
		throw new Error('The custom mode was read for a v14 change.');
	};

	it('gives a Pool Modification the custom type, which keeps Foundry from applying it', () => {
		expect(fromEditedChange(v14EditedChange('genesys.pool.skill.self', 'B', { type: 'add', skill: 'Cool' }), unreadMode)).toEqual(
			v14EditedChange('genesys.pool.skill.self.Cool', 'B'),
		);
	});

	it('splits the subject of a Pool Modification off its key, and keeps its type and phase', () => {
		expect(toEditedChange(v14EditedChange('genesys.pool.char.target.brawn', 'S'))).toEqual(
			v14EditedChange('genesys.pool.char.target', 'S', { char: 'brawn' }),
		);
	});

	it('edits a value Foundry stores as another type than a string as its JSON, as Foundry does', () => {
		expect(toEditedChange(v14EditedChange('system.soak', 1, { type: 'add' }))).toEqual(
			v14EditedChange('system.soak', '1', { type: 'add' }),
		);
		expect(toEditedChange(v14EditedChange('system.armor', null, { type: 'override' })).value).toBe('null');
	});

	it('round-trips every kind of key, with the custom type', () => {
		for (const key of ['genesys.pool.check.self.', 'genesys.pool.char.target.cunning', 'genesys.pool.skill.self.Cool']) {
			expect(fromEditedChange(toEditedChange(v14EditedChange(key, 'B')), unreadMode)).toEqual(v14EditedChange(key, 'B'));
		}
	});
});
