/**
 * @file Tests for what an item dropped on a character does to them.
 */

import { describe, expect, it } from 'vitest';
import { Character, CharacterItem, decideCharacterDrop, DroppedItem } from '@/actor/data/character/CharacterItems';
import { Entry, EntryType } from '@/actor/data/character/ExperienceJournal';

/**
 * A character with 100 Starting XP and the given items, before any Archetype.
 */
function character(items: CharacterItem[] = [], overrides: Partial<Character> = {}): Character {
	return {
		id: 'hero',
		system: {
			characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
			wounds: { max: 12 },
			strain: { max: 12 },
			experienceJournal: { entries: [{ amount: 100, type: EntryType.Starting }] },
		},
		items,
		advancement: {
			entries: [{ amount: 100, type: EntryType.Starting }],
			characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
			woundThreshold: 12,
			strainThreshold: 12,
			skills: [],
			talents: [],
			houseRules: { ignoreTalentPyramid: false, talentTierVersions: false },
		},
		...overrides,
	};
}

function skill(id: string, name: string, rank = 0, career = false): CharacterItem {
	return { id, name, type: 'skill', system: { rank, career } };
}

function dropped(type: string, name: string, system: object = {}): DroppedItem {
	const source = { _id: 'source', name, type, system };
	return { type, name, system, source };
}

/**
 * Ids handed out in order, as the operation draws them.
 */
function ids() {
	let next = 0;
	return () => `new${++next}`;
}

describe('decideCharacterDrop', () => {
	describe('an ability, a Critical Injury or a skill', () => {
		it('copies an ability or a Critical Injury on the character, under a new id', () => {
			for (const type of ['ability', 'injury']) {
				expect(decideCharacterDrop(character(), dropped(type, 'Tough'), ids())).toEqual({
					action: 'write',
					plan: {
						itemCreates: [{ _id: 'new1', name: 'Tough', type, system: {} }],
						itemUpdates: [],
						itemDeletes: [],
						actorUpdate: {},
					},
				});
			}
		});

		it('copies a skill the character lacks', () => {
			expect(decideCharacterDrop(character([skill('cool', 'Cool')]), dropped('skill', 'Ranged'), ids())).toMatchObject({
				action: 'write',
				plan: { itemCreates: [{ _id: 'new1', name: 'Ranged', type: 'skill' }] },
			});
		});

		it('refuses a skill the character owns, whatever the case of its name, so they never own a skill twice', () => {
			expect(decideCharacterDrop(character([skill('ranged', 'ranged')]), dropped('skill', 'Ranged'), ids())).toEqual({
				action: 'refuse',
			});
		});
	});

	describe('a talent', () => {
		it('buys a new talent for 5 XP per tier, under a new id the Experience Journal records (CRB p. 72)', () => {
			expect(decideCharacterDrop(character(), dropped('talent', 'Grit', { tier: 1 }), ids())).toEqual({
				action: 'write',
				plan: {
					itemCreates: [{ _id: 'new1', name: 'Grit', type: 'talent', system: { tier: 1 } }],
					itemUpdates: [],
					itemDeletes: [],
					actorUpdate: {
						'system.experienceJournal.entries': [
							{ amount: 100, type: EntryType.Starting },
							{ amount: -5, type: EntryType.NewTalent, data: { name: 'Grit', id: 'new1', tier: 1, rank: 1 } },
						],
					},
				},
			});
		});

		it('buys the next rank of a ranked talent the character owns, at its next tier (CRB p. 72)', () => {
			const hero = character([], {
				advancement: {
					...character().advancement,
					talents: [
						{ id: 'grit', name: 'Grit', ranked: 'yes', tier: 1, rank: 1 },
						{ id: 'swift', name: 'Swift', ranked: 'no', tier: 1, rank: 1 },
					],
				},
			});

			expect(decideCharacterDrop(hero, dropped('talent', 'Grit', { tier: 1 }), ids())).toMatchObject({
				action: 'write',
				plan: { itemCreates: [], itemUpdates: [{ _id: 'grit', 'system.rank': 2 }] },
			});
		});

		it('buys a talent at the tier it is dropped at, which only sets its cost, the Talent Pyramid aside', () => {
			const hero = character([], {
				advancement: { ...character().advancement, houseRules: { ignoreTalentPyramid: true, talentTierVersions: false } },
			});

			const decision = decideCharacterDrop(hero, dropped('talent', 'Indomitable', { tier: 4 }), ids());

			expect(decision).toMatchObject({ action: 'write', plan: { itemCreates: [{ _id: 'new1', name: 'Indomitable' }] } });
			expect(decision.action === 'write' && decision.plan.actorUpdate['system.experienceJournal.entries']).toContainEqual({
				amount: -20,
				type: EntryType.NewTalent,
				data: { name: 'Indomitable', id: 'new1', tier: 4, rank: 1 },
			});
		});

		it('refuses a talent the character cannot afford, and says why', () => {
			const poor = character([], {
				advancement: { ...character().advancement, entries: [{ amount: 4, type: EntryType.Starting }] },
			});
			expect(decideCharacterDrop(poor, dropped('talent', 'Grit', { tier: 1 }), ids())).toEqual({
				action: 'refuse',
				refusal: { key: 'Genesys.Notifications.CannotAffordTalent', data: { name: 'Grit', cost: 5 } },
			});
		});
	});

	describe('an Archetype', () => {
		const brute = {
			characteristics: { brawn: 3, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
			woundThreshold: 10,
			strainThreshold: 10,
			startingXP: 100,
			grantedItems: [
				{ name: 'Athletics', type: 'skill' },
				{
					name: 'Tough',
					type: 'ability',
					flags: { core: { sourceId: 'Item.tough' }, genesys: { archetypeGrant: 'stale', other: 1 } },
				},
			],
		};
		const scholar = {
			characteristics: { brawn: 2, agility: 2, intellect: 3, cunning: 2, willpower: 2, presence: 2 },
			woundThreshold: 12,
			strainThreshold: 8,
			startingXP: 110,
			grantedItems: [
				{ name: 'athletics', type: 'skill' },
				{ name: 'Knowledge', type: 'skill' },
				{ name: 'Gifted', type: 'talent' },
			],
		};

		/**
		 * A character before any Archetype: no characteristics, thresholds or XP yet.
		 */
		function newcomer(items: CharacterItem[] = []) {
			return character(items, {
				system: {
					characteristics: { brawn: 0, agility: 0, intellect: 0, cunning: 0, willpower: 0, presence: 0 },
					wounds: { max: 0 },
					strain: { max: 0 },
					experienceJournal: { entries: [] },
				},
			});
		}

		/**
		 * A character who took the Brute Archetype, and holds what it gave them.
		 */
		function brutish(entries: Entry[] = [{ amount: 100, type: EntryType.Starting }]) {
			const items = [
				{ id: 'brute', name: 'Brute', type: 'archetype', system: brute },
				skill('athletics', 'Athletics', 1),
				skill('knowledge', 'Knowledge', 0),
				{ id: 'tough', name: 'Tough', type: 'ability', system: {}, flags: { genesys: { archetypeGrant: 'hero' } } },
				{ id: 'byHand', name: 'Tough', type: 'ability', system: {} },
			];
			return character(items, {
				system: {
					characteristics: { brawn: 3, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
					wounds: { max: 13 },
					strain: { max: 12 },
					experienceJournal: { entries },
				},
			});
		}

		it("gives a new character the Archetype's characteristics, thresholds, Starting XP, granted items and skill ranks, in one write of each kind (CRB p. 35-39)", () => {
			// A granted item copied from another character holds its id: the flag takes this character's, the other flags stay.
			const hero = newcomer([skill('athletics', 'Athletics')]);

			expect(decideCharacterDrop(hero, dropped('archetype', 'Brute', brute), ids())).toEqual({
				action: 'write',
				plan: {
					itemCreates: [
						{
							_id: 'new1',
							name: 'Tough',
							type: 'ability',
							flags: { core: { sourceId: 'Item.tough' }, genesys: { archetypeGrant: 'hero', other: 1 } },
						},
						{ _id: 'new2', name: 'Brute', type: 'archetype', system: brute },
					],
					itemUpdates: [{ _id: 'athletics', 'system.rank': 1 }],
					itemDeletes: [],
					actorUpdate: {
						'system.characteristics.brawn': 3,
						'system.characteristics.agility': 2,
						'system.characteristics.intellect': 2,
						'system.characteristics.cunning': 2,
						'system.characteristics.willpower': 2,
						'system.characteristics.presence': 2,
						'system.wounds.max': 13,
						'system.strain.max': 12,
						'system.experienceJournal.entries': [{ amount: 100, type: EntryType.Starting }],
					},
				},
			});
		});

		it('replaces the Archetype the character holds: what it gave goes, what the new one gives comes, in one write of each kind', () => {
			expect(decideCharacterDrop(brutish(), dropped('archetype', 'Scholar', scholar), ids())).toEqual({
				action: 'write',
				plan: {
					itemCreates: [
						{ _id: 'new1', name: 'Gifted', type: 'talent', flags: { genesys: { archetypeGrant: 'hero' } } },
						{ _id: 'new2', name: 'Scholar', type: 'archetype', system: scholar },
					],
					// Athletics, which both grant, keeps its rank.
					itemUpdates: [{ _id: 'knowledge', 'system.rank': 1 }],
					// The hand-made copy of the Brute's ability stays.
					itemDeletes: ['tough', 'brute'],
					actorUpdate: {
						'system.characteristics.brawn': 2,
						'system.characteristics.agility': 2,
						'system.characteristics.intellect': 3,
						'system.characteristics.cunning': 2,
						'system.characteristics.willpower': 2,
						'system.characteristics.presence': 2,
						'system.wounds.max': 14,
						'system.strain.max': 10,
						'system.experienceJournal.entries': [{ amount: 110, type: EntryType.Starting }],
					},
				},
			});
		});

		it('refuses an Archetype once the Experience Journal holds more than the Starting XP, and says what to undo', () => {
			const awarded = brutish([
				{ amount: 100, type: EntryType.Starting },
				{ amount: 5, type: EntryType.Award },
			]);

			expect(decideCharacterDrop(awarded, dropped('archetype', 'Scholar', scholar), ids())).toEqual({
				action: 'refuse',
				refusal: { key: 'Genesys.Notifications.CannotReplaceArchetype', data: { name: 'Scholar' } },
			});
		});
	});

	describe('a Career', () => {
		const ranger = { careerSkills: [{ name: 'ranged' }, { name: 'Stealth' }, { name: 'Survival' }] };
		const soldier = { careerSkills: [{ name: 'Ranged' }, { name: 'Melee' }] };

		function skills() {
			return [skill('ranged', 'Ranged'), skill('stealth', 'Stealth'), skill('melee', 'Melee'), skill('cool', 'Cool', 2)];
		}

		it("asks first which of the character's skills the Career lists, whatever their case, get its Free Ranks (CRB p. 40)", () => {
			expect(decideCharacterDrop(character(skills()), dropped('career', 'Ranger', ranger), ids())).toEqual({
				action: 'chooseFreeRanks',
				skillIds: ['ranged', 'stealth'],
			});
		});

		it('adds the Career with the Free Ranks chosen, and marks its skills, in one write of each kind', () => {
			expect(decideCharacterDrop(character(skills()), dropped('career', 'Ranger', ranger), ids(), ['stealth'])).toEqual({
				action: 'write',
				plan: {
					itemCreates: [{ _id: 'new1', name: 'Ranger', type: 'career', system: { ...ranger, selectedSkillIDs: ['stealth'] } }],
					itemUpdates: [
						{ _id: 'ranged', 'system.career': true, 'system.rank': 0 },
						{ _id: 'stealth', 'system.career': true, 'system.rank': 1 },
					],
					itemDeletes: [],
					actorUpdate: {},
				},
			});
		});

		it('replaces the Career the character holds: its marks and Free Ranks go, then the new one gives its own', () => {
			const held = [
				{ id: 'soldier', name: 'Soldier', type: 'career', system: { ...soldier, selectedSkillIDs: ['ranged', 'melee'] } },
				skill('ranged', 'Ranged', 1, true),
				skill('stealth', 'Stealth'),
				skill('melee', 'Melee', 1, true),
			];

			expect(decideCharacterDrop(character(held), dropped('career', 'Ranger', ranger), ids(), ['ranged'])).toEqual({
				action: 'write',
				plan: {
					itemCreates: [{ _id: 'new1', name: 'Ranger', type: 'career', system: { ...ranger, selectedSkillIDs: ['ranged'] } }],
					itemUpdates: [
						// Ranged, which both list, trades the Soldier's Free Rank for the Ranger's.
						{ _id: 'ranged', 'system.career': true, 'system.rank': 1 },
						{ _id: 'melee', 'system.career': false, 'system.rank': 0 },
						{ _id: 'stealth', 'system.career': true, 'system.rank': 0 },
					],
					itemDeletes: ['soldier'],
					actorUpdate: {},
				},
			});
		});

		it('refuses a Career once a skill rank is bought, whose cost depended on the Career, before asking anything, and says what to undo', () => {
			const trained = character(skills(), {
				advancement: {
					...character().advancement,
					entries: [
						{ amount: 100, type: EntryType.Starting },
						{ amount: -5, type: EntryType.Skill, data: { name: 'Ranged', id: 'ranged', rank: 1 } },
					],
				},
			});

			expect(decideCharacterDrop(trained, dropped('career', 'Ranger', ranger), ids())).toEqual({
				action: 'refuse',
				refusal: { key: 'Genesys.Notifications.CannotReplaceCareer', data: { name: 'Ranger' } },
			});
		});
	});

	it('refuses an item of a type a character takes no drop of', () => {
		expect(decideCharacterDrop(character(), dropped('vehicleWeapon', 'Laser'), ids())).toEqual({ action: 'refuse' });
	});
});
