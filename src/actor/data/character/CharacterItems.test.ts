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
			alternateRules: { careerOnlyMagicSkills: false },
		},
		...overrides,
	};
}

function skill(id: string, name: string, rank = 0, career = false): CharacterItem {
	return { id, name, type: 'skill', system: { rank, career } };
}

/**
 * An item as Foundry holds it: its fields are its own properties, but its id is a getter on its prototype, which a copy
 * made by spreading it (`{ ...item }`) leaves out.
 */
class DocumentLike {
	_id: string;
	name: string;
	type: string;
	system: object;

	constructor(id: string, name: string, type: string, system: object) {
		this._id = id;
		this.name = name;
		this.type = type;
		this.system = system;
	}

	get id() {
		return this._id;
	}
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
	describe('an ability, a Critical Injury, a spell or a skill', () => {
		it('copies an ability, a Critical Injury or a spell on the character, under a new id', () => {
			for (const type of ['ability', 'injury', 'spell']) {
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
						{ id: 'grit', name: 'Grit', ranked: 'yes', tier: 1, rank: 1, careerSkillIds: [] },
						{ id: 'swift', name: 'Swift', ranked: 'no', tier: 1, rank: 1, careerSkillIds: [] },
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
			nonCareerSkillChoices: 0,
			chosenSkillIds: [],
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
			nonCareerSkillChoices: 0,
			chosenSkillIds: [],
		};
		const human = {
			characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
			woundThreshold: 10,
			strainThreshold: 10,
			startingXP: 110,
			grantedItems: [],
			nonCareerSkillChoices: 2,
			chosenSkillIds: [],
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

		it("keeps the rank of a skill both the held and the dropped Archetype grant, on items like Foundry's", () => {
			const held = brutish();
			held.items = [
				new DocumentLike('brute', 'Brute', 'archetype', brute),
				new DocumentLike('athletics', 'Athletics', 'skill', { rank: 1 }),
				new DocumentLike('knowledge', 'Knowledge', 'skill', { rank: 0 }),
			];

			expect(decideCharacterDrop(held, dropped('archetype', 'Scholar', scholar), ids())).toMatchObject({
				action: 'write',
				plan: { itemUpdates: [{ _id: 'knowledge', 'system.rank': 1 }], itemDeletes: ['brute'] },
			});
		});

		it('leaves at 0 a skill both the held and the dropped Archetype grant whose rank was taken back by hand: its rank changes by the net change', () => {
			const held = brutish();
			held.items = held.items.map((item) => (item.id === 'athletics' ? skill('athletics', 'Athletics', 0) : item));

			expect(decideCharacterDrop(held, dropped('archetype', 'Scholar', scholar), ids())).toMatchObject({
				action: 'write',
				plan: { itemUpdates: [{ _id: 'knowledge', 'system.rank': 1 }] },
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

		describe('with non-career skill choices', () => {
			/**
			 * A character whose Career makes Ranged a career skill, who marked Cool by hand, and whose talent's effect makes
			 * Arcana one: the skills tab's career skills, which Advancement reads.
			 */
			function skilled(items: CharacterItem[] = [], system = newcomer().system) {
				const skills = [
					skill('ranged', 'Ranged', 0, true),
					skill('cool', 'Cool', 0, true),
					skill('arcana', 'Arcana'),
					skill('stealth', 'Stealth'),
					skill('charm', 'Charm', 1),
				];
				const careerSkills = new Set(['ranged', 'cool', 'arcana']);
				return character([...skills, ...items], {
					system,
					advancement: {
						...character().advancement,
						skills: skills.map(({ id, name, system }) => ({
							id,
							name,
							rank: (system as { rank: number }).rank,
							career: careerSkills.has(id),
							category: 'general' as const,
						})),
					},
				});
			}

			it("asks for as many different skills as the Archetype gives, among the character's non-career skills, leaving out their Career's, those marked by hand and those an effect makes career skills (RoT p. 61)", () => {
				expect(decideCharacterDrop(skilled(), dropped('archetype', 'Human', human), ids())).toEqual({
					action: 'chooseSkills',
					choice: { kind: 'nonCareerSkills', count: 2 },
					skillIds: ['stealth', 'charm'],
				});
			});

			describe('under the Career-Only Magic Skills alternate rule', () => {
				/**
				 * A character whose Career makes Arcana a career skill, and who has Divine and Primal, magic skills, and Stealth,
				 * none of which is a career skill.
				 */
				function caster(careerOnlyMagicSkills: boolean) {
					const skills = [
						{ ...skill('arcana', 'Arcana', 0, true), category: 'magic' as const },
						{ ...skill('divine', 'Divine'), category: 'magic' as const },
						{ ...skill('stealth', 'Stealth'), category: 'general' as const },
						{ ...skill('primal', 'Primal'), category: 'magic' as const },
					];
					return character(
						skills.map(({ category: _, ...item }) => item),
						{
							system: newcomer().system,
							advancement: {
								...character().advancement,
								skills: skills.map(({ id, name, system, category }) => {
									const { rank, career } = system as { rank: number; career: boolean };
									return { id, name, rank, career, category };
								}),
								alternateRules: { careerOnlyMagicSkills },
							},
						},
					);
				}

				it("leaves out the magic skills that aren't career skills, which the character could never raise (RoT p. 115, CRB p. 212)", () => {
					expect(decideCharacterDrop(caster(true), dropped('archetype', 'Human', human), ids())).toMatchObject({
						action: 'chooseSkills',
						skillIds: ['stealth'],
					});
				});

				it('offers the magic skills that are no career skills without the rule', () => {
					expect(decideCharacterDrop(caster(false), dropped('archetype', 'Human', human), ids())).toMatchObject({
						action: 'chooseSkills',
						skillIds: ['divine', 'stealth', 'primal'],
					});
				});
			});

			it('asks nothing for an Archetype without choices', () => {
				expect(decideCharacterDrop(skilled(), dropped('archetype', 'Scholar', scholar), ids())).toMatchObject({ action: 'write' });
			});

			it('gives each chosen skill a rank, and the Archetype keeps the chosen skills', () => {
				expect(decideCharacterDrop(skilled(), dropped('archetype', 'Human', human), ids(), ['stealth', 'charm'])).toMatchObject({
					action: 'write',
					plan: {
						itemCreates: [
							{ _id: 'new1', name: 'Human', type: 'archetype', system: { ...human, chosenSkillIds: ['stealth', 'charm'] } },
						],
						itemUpdates: [
							{ _id: 'stealth', 'system.rank': 1 },
							{ _id: 'charm', 'system.rank': 2 },
						],
						itemDeletes: [],
					},
				});
			});

			it('keeps the skills chosen now, not those an Archetype copied from another character holds', () => {
				const copied = dropped('archetype', 'Human', { ...human, chosenSkillIds: ['ranged', 'cool'] });

				expect(decideCharacterDrop(skilled(), copied, ids(), ['stealth'])).toMatchObject({
					action: 'write',
					plan: {
						itemCreates: [{ system: { chosenSkillIds: ['stealth'] } }],
						itemUpdates: [{ _id: 'stealth', 'system.rank': 1 }],
					},
				});
			});

			it('drops the Archetype without chosen skills when none was offered', () => {
				expect(decideCharacterDrop(skilled(), dropped('archetype', 'Human', human), ids(), [])).toMatchObject({
					action: 'write',
					plan: { itemCreates: [{ name: 'Human', system: { chosenSkillIds: [] } }], itemUpdates: [] },
				});
			});

			it('cancels the drop when the window is closed, so the Archetype held and its chosen ranks stay', () => {
				const humanHeld = { id: 'human', name: 'Human', type: 'archetype', system: { ...human, chosenSkillIds: ['stealth'] } };

				expect(decideCharacterDrop(skilled([humanHeld]), dropped('archetype', 'Other Human', human), ids(), null)).toEqual({
					action: 'refuse',
				});
			});

			it('asks again when the Archetype is replaced by one with choices, then takes back the ranks of the skills chosen for the held one', () => {
				const humanHeld = {
					id: 'human',
					name: 'Human',
					type: 'archetype',
					system: { ...human, chosenSkillIds: ['stealth', 'charm'] },
				};
				const held = skilled([humanHeld], {
					characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
					wounds: { max: 12 },
					strain: { max: 12 },
					experienceJournal: { entries: [{ amount: 110, type: EntryType.Starting }] },
				});
				// Each skill chosen for the held Human holds its rank.
				held.items = held.items.map((item) =>
					item.id === 'stealth' ? skill('stealth', 'Stealth', 1) : item.id === 'charm' ? skill('charm', 'Charm', 2) : item,
				);
				const otherHuman = { ...human, startingXP: 100 };

				expect(decideCharacterDrop(held, dropped('archetype', 'Other Human', otherHuman), ids())).toMatchObject({
					action: 'chooseSkills',
					choice: { kind: 'nonCareerSkills', count: 2 },
				});
				expect(
					decideCharacterDrop(held, dropped('archetype', 'Other Human', otherHuman), ids(), ['charm', 'arcana']),
				).toMatchObject({
					action: 'write',
					plan: {
						itemUpdates: [
							{ _id: 'stealth', 'system.rank': 0 },
							{ _id: 'arcana', 'system.rank': 1 },
						],
						itemDeletes: ['human'],
					},
				});
			});

			it("keeps the rank of a skill chosen for both the held and the dropped Archetype, on items like Foundry's", () => {
				const held = character(
					[
						new DocumentLike('human', 'Human', 'archetype', { ...human, chosenSkillIds: ['brawl', 'deception'] }),
						new DocumentLike('brawl', 'Brawl', 'skill', { rank: 1, career: false }),
						new DocumentLike('deception', 'Deception', 'skill', { rank: 1, career: false }),
						new DocumentLike('survival', 'Survival', 'skill', { rank: 0, career: false }),
					],
					{ system: { ...newcomer().system, experienceJournal: { entries: [{ amount: 110, type: EntryType.Starting }] } } },
				);

				expect(
					decideCharacterDrop(held, dropped('archetype', 'Other Human', human), ids(), ['deception', 'survival']),
				).toMatchObject({
					action: 'write',
					plan: {
						itemUpdates: [
							{ _id: 'brawl', 'system.rank': 0 },
							{ _id: 'survival', 'system.rank': 1 },
						],
						itemDeletes: ['human'],
					},
				});
			});

			it('takes back the ranks of the skills chosen for the held Archetype when one without choices replaces it', () => {
				const humanHeld = { id: 'human', name: 'Human', type: 'archetype', system: { ...human, chosenSkillIds: ['stealth'] } };
				const held = skilled([humanHeld], {
					characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
					wounds: { max: 12 },
					strain: { max: 12 },
					experienceJournal: { entries: [{ amount: 110, type: EntryType.Starting }] },
				});
				held.items = held.items.map((item) => (item.id === 'stealth' ? skill('stealth', 'Stealth', 1) : item));

				expect(decideCharacterDrop(held, dropped('archetype', 'Scholar', { ...scholar, grantedItems: [] }), ids())).toMatchObject({
					action: 'write',
					plan: { itemUpdates: [{ _id: 'stealth', 'system.rank': 0 }], itemDeletes: ['human'] },
				});
			});

			it('refuses an Archetype with choices before asking anything once the Experience Journal holds more than the Starting XP', () => {
				const awarded = skilled([], {
					...newcomer().system,
					experienceJournal: {
						entries: [
							{ amount: 110, type: EntryType.Starting },
							{ amount: 5, type: EntryType.Award },
						],
					},
				});

				expect(decideCharacterDrop(awarded, dropped('archetype', 'Human', human), ids())).toMatchObject({ action: 'refuse' });
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
				action: 'chooseSkills',
				choice: { kind: 'freeRanks' },
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

		it('adds the Career without Free Ranks when the window is closed', () => {
			expect(decideCharacterDrop(character(skills()), dropped('career', 'Ranger', ranger), ids(), null)).toMatchObject({
				action: 'write',
				plan: { itemCreates: [{ name: 'Ranger', system: { selectedSkillIDs: [] } }] },
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

		it("keeps a skill both the held and the dropped Career list a career skill, with the Free Rank chosen again, on items like Foundry's", () => {
			const held = character([
				new DocumentLike('soldier', 'Soldier', 'career', { ...soldier, selectedSkillIDs: ['ranged'] }),
				new DocumentLike('ranged', 'Ranged', 'skill', { rank: 1, career: true }),
				new DocumentLike('melee', 'Melee', 'skill', { rank: 0, career: true }),
			]);

			expect(decideCharacterDrop(held, dropped('career', 'Ranger', ranger), ids(), ['ranged'])).toMatchObject({
				action: 'write',
				plan: {
					itemUpdates: [
						{ _id: 'ranged', 'system.career': true, 'system.rank': 1 },
						{ _id: 'melee', 'system.career': false, 'system.rank': 0 },
					],
					itemDeletes: ['soldier'],
				},
			});
		});

		it('leaves at 0 a skill chosen for both Careers whose Free Rank was taken back by hand: its rank changes by the net change', () => {
			const held = character([
				{ id: 'soldier', name: 'Soldier', type: 'career', system: { ...soldier, selectedSkillIDs: ['ranged'] } },
				skill('ranged', 'Ranged', 0, true),
			]);

			expect(decideCharacterDrop(held, dropped('career', 'Ranger', ranger), ids(), ['ranged'])).toMatchObject({
				action: 'write',
				plan: { itemUpdates: [{ _id: 'ranged', 'system.career': true, 'system.rank': 0 }] },
			});
		});

		it("accepts a Career that lists a skill chosen for the Archetype's non-career skills: the skill keeps its rank and becomes a career skill", () => {
			const human = { id: 'human', name: 'Human', type: 'archetype', system: { grantedItems: [], chosenSkillIds: ['stealth'] } };
			const held = character([human, skill('ranged', 'Ranged'), skill('stealth', 'Stealth', 1)]);

			expect(decideCharacterDrop(held, dropped('career', 'Ranger', ranger), ids())).toEqual({
				action: 'chooseSkills',
				choice: { kind: 'freeRanks' },
				skillIds: ['ranged', 'stealth'],
			});
			expect(decideCharacterDrop(held, dropped('career', 'Ranger', ranger), ids(), ['ranged'])).toMatchObject({
				action: 'write',
				plan: {
					itemUpdates: [
						{ _id: 'ranged', 'system.career': true, 'system.rank': 1 },
						{ _id: 'stealth', 'system.career': true, 'system.rank': 1 },
					],
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
