import { describe, expect, it } from 'vitest';
import { Characteristic } from '@/data/Characteristics';
import { DieTypes } from '@/dice/DieTypes';
import {
	aimBoosts,
	aimBoostsAfterClick,
	aimGiving,
	aimHint,
	effectsUsedUp,
	GUARDED_STANCE,
	type ManeuverEffect,
} from '@/effects/Maneuvers';
import { type PoolModificationActor, poolModificationsForCheck } from '@/effects/PoolModifications';

const BOOST = DieTypes.Boost.GLYPH;
const SETBACK = DieTypes.Setback.GLYPH;

/**
 * A character holding the effect of a maneuver, as its action creates it.
 */
function characterWith(maneuver: ManeuverEffect): PoolModificationActor {
	return {
		type: 'character',
		system: {},
		allApplicableEffects: () => [
			{
				name: maneuver.name,
				uuid: `Actor.hero.ActiveEffect.${maneuver.id}`,
				isSuppressed: false,
				origin: null,
				parent: null,
				changes: maneuver.changes,
			},
		],
	};
}

const melee = { characteristic: Characteristic.Brawn, skillName: 'Melee', attackRange: 'engaged' };
const ranged = { characteristic: Characteristic.Agility, skillName: 'Ranged', attackRange: 'medium' };
const stealth = { characteristic: Characteristic.Agility, skillName: 'Stealth' };

describe('Aim', () => {
	it('brings a Boost to the next combat check, melee or ranged (CRB p. 98)', () => {
		const aiming = characterWith(aimGiving(1));
		for (const attack of [melee, ranged]) {
			expect(poolModificationsForCheck(aiming, undefined, attack)).toEqual([
				{ source: 'self', from: { effect: 'Genesys.Maneuvers.Aim.Name', uuid: 'Actor.hero.ActiveEffect.aim' }, mods: [BOOST] },
			]);
		}
	});

	it('brings two Boosts after two Aim maneuvers in a row (CRB p. 98)', () => {
		const twice = aimGiving(aimBoostsAfterClick(aimBoosts(aimGiving(aimBoostsAfterClick(0)).changes)));
		expect(poolModificationsForCheck(characterWith(twice), undefined, melee)[0].mods).toEqual([BOOST, BOOST]);
		expect(aimBoosts(twice.changes)).toBe(2);
	});

	it('brings nothing to a check that is no combat check (CRB p. 98)', () => {
		expect(poolModificationsForCheck(characterWith(aimGiving(1)), undefined, stealth)).toEqual([]);
	});

	it('counts no Boost on changes that hold none', () => {
		expect(aimBoosts([])).toBe(0);
		expect(aimBoosts([{ key: 'system.soak', value: '1' }])).toBe(0);
	});
});

describe('the Aim button', () => {
	it('gives one Boost, then two, then takes Aim back, one click after the other', () => {
		expect([0, 1, 2].map(aimBoostsAfterClick)).toEqual([1, 2, 0]);
	});

	it('says what its next click does', () => {
		expect([0, 1, 2].map(aimHint)).toEqual([
			'Genesys.Maneuvers.Aim.Hint',
			'Genesys.Maneuvers.Aim.HintAgain',
			'Genesys.Maneuvers.Aim.TakeBack',
		]);
	});
});

describe('Guarded Stance', () => {
	it("brings a Setback to the character's combat checks, and none to their other checks (CRB p. 99)", () => {
		const guarded = characterWith(GUARDED_STANCE);
		for (const attack of [melee, ranged]) {
			expect(poolModificationsForCheck(guarded, undefined, attack)).toEqual([
				{
					source: 'self',
					from: { effect: 'Genesys.Maneuvers.GuardedStance.Name', uuid: 'Actor.hero.ActiveEffect.guardedStance' },
					mods: [SETBACK],
				},
			]);
		}
		expect(poolModificationsForCheck(guarded, undefined, stealth)).toEqual([]);
	});

	it("provides melee defense 1, which Foundry's Upgrade mode keeps only when no other source provides more (CRB p. 99, 106)", () => {
		expect(GUARDED_STANCE.changes).toContainEqual({ key: 'system.providedDefense.melee', value: '1', type: 'upgrade' });
	});
});

describe('effectsUsedUp', () => {
	const effects = [
		{ id: 'aim', statuses: new Set(['aim']) },
		{ id: 'guarded', statuses: new Set(['guardedStance']) },
		{ id: 'prone', statuses: new Set(['prone']) },
		{ id: 'talent', statuses: new Set<string>() },
	];

	it("uses up the actor's Aim with their next combat check (CRB p. 98)", () => {
		expect(effectsUsedUp({ kind: 'attack', weaponName: 'Sword' }, effects)).toEqual(['aim']);
	});

	it("uses up the actor's Aim with a magic attack, a combat check (CRB pp. 98, 215)", () => {
		expect(effectsUsedUp({ kind: 'spell', spellName: 'Fireball', isAttack: true }, effects)).toEqual(['aim']);
	});

	it('uses up nothing with a check that is no combat check', () => {
		expect(effectsUsedUp({ kind: 'check' }, effects)).toEqual([]);
		expect(effectsUsedUp({ kind: 'spell', spellName: 'Curse', isAttack: false }, effects)).toEqual([]);
		expect(effectsUsedUp({ kind: 'initiative' }, effects)).toEqual([]);
	});
});
