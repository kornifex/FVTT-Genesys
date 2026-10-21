/**
 * @file Tests for the Pool Modifications that come from effects.
 */

import { describe, expect, it, vi } from 'vitest';

// The dice types extend Foundry's `Die`, the Dice So Nice! registration listens to `Hooks`, and edited changes get
// Foundry's custom effect mode; all are Foundry globals.
vi.hoisted(() => {
	Object.assign(globalThis, {
		Die: class {},
		Hooks: { once: () => {}, on: () => {} },
		CONST: { ACTIVE_EFFECT_MODES: { CUSTOM: 0, ADD: 2 } },
	});
});

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

type Change = { key: string; value: string };

function talent(rank: number, scalesWithRank: 'yes' | 'no' = 'no') {
	return { documentName: 'Item', id: 'talentId', type: 'talent', system: { rank, scalesWithRank } };
}

function effect(changes: Change[], { name = 'Effect', isSuppressed = false, origin = null, parent = null }: { name?: string; isSuppressed?: boolean; origin?: string | null; parent?: unknown } = {}): PoolModificationEffect {
	return { name, isSuppressed, origin, parent, changes };
}

/**
 * An actor whose applicable effects are the given ones.
 */
function actor(type: string, effects: PoolModificationEffect[], { totalDefense = { melee: 0, ranged: 0 } } = {}): PoolModificationActor {
	return {
		type,
		systemData: { totalDefense },
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

	it('decodes the keys it encodes', () => {
		for (const key of [
			{ kind: 'check', source: 'self', subject: '' },
			{ kind: 'char', source: 'target', subject: 'brawn' },
			{ kind: 'skill', source: 'self', subject: 'Ranged (Light)' },
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

	it("doesn't scale a numeric change of another item, or a change that isn't a number", () => {
		expect(scaledChangeValue({ type: 'gear', system: {} }, { key: 'system.soak', value: '1' })).toBe('1');
		expect(scaledChangeValue(undefined, { key: 'system.soak', value: '1' })).toBe('1');
		expect(scaledChangeValue(talent(3), { key: 'system.notes', value: 'text' })).toBe('text');
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

		expect(poolModificationsForCheck(self, undefined, check)).toEqual([{ source: 'self', from: { effect: 'Talent' }, mods: ['B', 'A', '^'] }]);
	});

	it('collects the changes of a skill whatever the case of its name', () => {
		const self = actor('character', [effect([{ key: 'genesys.pool.skill.self.Ranged (Light)', value: 'B' }], { name: 'Talent' })]);

		expect(poolModificationsForCheck(self, undefined, { characteristic: Characteristic.Agility, skillName: 'Ranged (light)' })).toEqual([{ source: 'self', from: { effect: 'Talent' }, mods: ['B'] }]);
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

	it('leaves out suppressed effects and effects without a relevant change', () => {
		const self = actor('character', [effect([{ key: 'genesys.pool.check.self.', value: 'B' }], { isSuppressed: true }), effect([{ key: 'system.soak', value: '1' }])]);

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
			{ source: 'self', from: { effect: 'Mine' }, mods: ['B'] },
			{ source: 'target', from: { effect: 'Theirs' }, mods: ['S', 'D'] },
		]);
	});

	it("adds the target's defense against the range of an attack", () => {
		const self = actor('character', []);
		const character = actor('character', [], { totalDefense: { melee: 1, ranged: 2 } });
		const adversary = actor('nemesis', [], { totalDefense: { melee: 0, ranged: 1 } });

		expect(poolModificationsForCheck(self, character, { attackRange: 'engaged' })).toEqual([{ source: 'target', from: { defense: 'melee' }, mods: ['S'] }]);
		expect(poolModificationsForCheck(self, character, { attackRange: 'long' })).toEqual([{ source: 'target', from: { defense: 'ranged' }, mods: ['S', 'S'] }]);
		expect(poolModificationsForCheck(self, adversary, { attackRange: 'long' })).toEqual([{ source: 'target', from: { defense: 'ranged' }, mods: ['S'] }]);
		expect(poolModificationsForCheck(self, character, {})).toEqual([]);
	});

	it("leaves out the target's defense when it is 0 against the range of the attack", () => {
		const self = actor('character', []);
		const adversary = actor('nemesis', [], { totalDefense: { melee: 0, ranged: 1 } });

		expect(poolModificationsForCheck(self, adversary, { attackRange: 'engaged' })).toEqual([]);
		expect(poolModificationsForCheck(self, actor('rival', []), { attackRange: 'medium' })).toEqual([]);
	});

	it("ignores targets that aren't characters or adversaries, and everything without an actor", () => {
		const target = actor('vehicle', [effect([{ key: 'genesys.pool.check.target.', value: 'S' }])]);
		const self = actor('character', []);

		expect(poolModificationsForCheck(self, target, { attackRange: 'engaged' })).toEqual([]);
		expect(poolModificationsForCheck(undefined, actor('rival', [effect([{ key: 'genesys.pool.check.target.', value: 'S' }])]), {})).toEqual([]);
	});
});

/**
 * A change as Foundry stores it, with the extra fields the effect sheets edit.
 */
function editedChange(key: string, value: string, { mode = 0, char = undefined as string | undefined, skill = undefined as string | undefined } = {}) {
	const change = { key, value, mode, priority: 0 } as EditedChange;
	if (char !== undefined) {
		change.char = char;
	}
	if (skill !== undefined) {
		change.skill = skill;
	}
	return change;
}

describe('editing changes in the effect sheets', () => {
	it('splits the subject of a Pool Modification off its key', () => {
		const change = editedChange('genesys.pool.skill.target.Stealth', 'S');

		expect(toEditedChange(change)).toEqual(editedChange('genesys.pool.skill.target', 'S', { skill: 'Stealth' }));
		expect(toEditedChange(editedChange('genesys.pool.char.self.brawn', 'S'))).toEqual(editedChange('genesys.pool.char.self', 'S', { char: 'brawn' }));
		expect(toEditedChange(editedChange('genesys.pool.check.self.', 'S'))).toEqual(editedChange('genesys.pool.check.self', 'S'));
		expect(change.key).toBe('genesys.pool.skill.target.Stealth');
	});

	it('leaves other changes as they are', () => {
		expect(toEditedChange(editedChange('system.soak', '1', { mode: 2 }))).toEqual(editedChange('system.soak', '1', { mode: 2 }));
		expect(fromEditedChange(editedChange('system.soak', '1', { mode: 2, char: 'brawn' }))).toEqual(editedChange('system.soak', '1', { mode: 2, char: 'brawn' }));
	});

	it('puts the subject back into the key of a Pool Modification', () => {
		const subjects = { mode: 2, skill: 'Stealth', char: 'brawn' };

		expect(fromEditedChange(editedChange('genesys.pool.skill.target', 'S', subjects))).toEqual(editedChange('genesys.pool.skill.target.Stealth', 'S'));
		expect(fromEditedChange(editedChange('genesys.pool.char.self', 'S', subjects)).key).toBe('genesys.pool.char.self.brawn');
		expect(fromEditedChange(editedChange('genesys.pool.check.self', 'S', subjects)).key).toBe('genesys.pool.check.self.');
	});

	it('round-trips every kind of key', () => {
		for (const key of ['genesys.pool.check.self.', 'genesys.pool.char.target.cunning', 'genesys.pool.skill.self.Cool']) {
			expect(fromEditedChange(toEditedChange(editedChange(key, 'B'))).key).toBe(key);
		}
	});

	it('empties the value of a Pool Modification unless it only holds glyphs', () => {
		expect(fromEditedChange(editedChange('genesys.pool.check.self', '2')).value).toBe('');
		expect(fromEditedChange(editedChange('genesys.pool.check.self', 'BB')).value).toBe('BB');
	});

	it('offers the skills of the Skills Compendium and those the changes apply to', () => {
		const changes = [
			editedChange('genesys.pool.skill.self', 'B', { skill: 'Piloting (Space)' }),
			editedChange('genesys.pool.skill.target', 'S', { skill: 'Cool' }),
			editedChange('genesys.pool.char.self', 'B', { char: 'brawn' }),
			editedChange('genesys.pool.skill.self', 'B', { skill: '' }),
		];

		expect(skillChoices(['Cool', 'Athletics'], changes)).toEqual({ Cool: 'Cool', Athletics: 'Athletics', 'Piloting (Space)': 'Piloting (Space)' });
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
		expect(subjectFieldForKey('system.soak')).toBe('effect-mode');
	});
});
