/**
 * @file Advancement: spending XP on a characteristic, a skill rank, or a talent or a rank of one, and undoing it from the Experience Journal. Every change to the Experience Journal goes through this module.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import type { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import { Entry, EntryType } from '@/actor/data/character/ExperienceJournal';
import { isInCharacterCreation, maxPurchasableSkillRank } from '@/actor/data/character/CharacterCreation';
import * as TalentPyramid from '@/actor/data/character/TalentPyramid';
import { Characteristic, CharacteristicsContainer } from '@/data/Characteristics';
import type { CombatPool } from '@/data/Actors';
import type { GenesysItem } from '@/item/GenesysItem';
import type { SkillDataModel } from '@/item/data/SkillDataModel';
import type { TalentDataModel } from '@/item/data/TalentDataModel';
import { effectiveNextTier, effectiveTier } from '@/item/data/Talents';
import { Notification, notify } from '@/notifications';

/**
 * The highest value a characteristic can be raised to.
 */
const MAX_CHARACTERISTIC = 5;

/**
 * Raising a characteristic costs this many XP per rating it is raised to (CRB p. 44).
 */
const XP_PER_CHARACTERISTIC_RATING = 10;

/**
 * A skill rank costs this many XP per rank it is bought to (CRB p. 44).
 */
const XP_PER_SKILL_RANK = 5;

/**
 * A rank of a non-career skill costs this many XP more than a career skill's (CRB p. 44).
 */
const NON_CAREER_SKILL_EXTRA_XP = 5;

/**
 * A talent, or a rank of one, costs this many XP per tier it is bought at (CRB p. 44).
 */
const XP_PER_TALENT_TIER = 5;

type AdvancementSkill = {
	id: string;
	name: string;
	rank: number;
	career: boolean;
};

/**
 * What Advancement needs to know about a talent the character owns.
 */
export type AdvancementTalent = {
	id: string;
	name: string;
	ranked: 'yes' | 'no';
	tier: number;
	rank: number;
};

/**
 * What Advancement needs to know about a character.
 */
export type AdvancementCharacter = {
	entries: Entry[];
	characteristics: CharacteristicsContainer;
	woundThreshold: number;
	strainThreshold: number;
	skills: AdvancementSkill[];
	talents: AdvancementTalent[];
	houseRules: {
		ignoreTalentPyramid: boolean;
		talentTierVersions: boolean;
	};
};

/**
 * The writes a change makes to a character and their items: the items it creates (with their ids), updates and deletes,
 * and the update of the character. An Advancement's plan is one.
 */
export type CharacterWrites = {
	actorUpdate: Record<string, unknown>;
	itemCreates: Record<string, unknown>[];
	itemUpdates: ({ _id: string } & Record<string, unknown>)[];
	itemDeletes: string[];
};

/**
 * An Advancement's plan, or why it is refused, with what to tell the user if anything.
 */
export type AdvancementResult = { plan: CharacterWrites } | { refusal: Notification | undefined };

function refuse(key?: string, data?: Record<string, unknown>): AdvancementResult {
	return { refusal: key ? { key, data } : undefined };
}

function planFor(
	entries: Entry[],
	{ actorUpdate = {}, itemCreates = [], itemUpdates = [], itemDeletes = [] }: Partial<CharacterWrites> = {},
): AdvancementResult {
	return {
		plan: {
			actorUpdate: { ...actorUpdate, 'system.experienceJournal.entries': entries },
			itemCreates,
			itemUpdates,
			itemDeletes,
		},
	};
}

/**
 * Whether an Advancement is allowed, with a plan to write, rather than refused.
 */
export function isAllowed(result: AdvancementResult) {
	return 'plan' in result;
}

/**
 * The XP the character can still spend: what the Experience Journal gained, less what it spent.
 */
export function availableXP(entries: Pick<Entry, 'amount'>[]) {
	return entries.reduce((total, entry) => total + entry.amount, 0);
}

/**
 * The XP the character has gained over their lifetime, whether spent or not.
 */
export function totalXP(entries: Pick<Entry, 'amount'>[]) {
	return entries.reduce((total, entry) => total + Math.max(0, entry.amount), 0);
}

/**
 * The actor update of the wound and strain thresholds when characteristics change by the given amounts: Brawn adds to
 * the wound threshold and Willpower to the strain threshold (CRB p. 31, 45). A threshold whose characteristic doesn't
 * change is left out.
 */
export function thresholdUpdates(thresholds: { wounds: number; strain: number }, changes: Partial<CharacteristicsContainer>) {
	const update: Record<string, number> = {};
	if (changes.brawn !== undefined) {
		update['system.wounds.max'] = thresholds.wounds + changes.brawn;
	}
	if (changes.willpower !== undefined) {
		update['system.strain.max'] = thresholds.strain + changes.willpower;
	}
	return update;
}

function thresholdsOf(character: AdvancementCharacter) {
	return { wounds: character.woundThreshold, strain: character.strainThreshold };
}

/**
 * The Experience Journal with the Archetype's Starting XP, which is always its first entry.
 */
export function withStartingXP(entries: Entry[], amount: number): Entry[] {
	return [{ amount, type: EntryType.Starting }, ...entries];
}

/**
 * The Experience Journal without the Archetype's Starting XP, its first entry.
 */
export function withoutStartingXP(entries: Entry[]): Entry[] {
	return entries.slice(1);
}

/**
 * A Career can be replaced until a skill rank is bought, since that rank's cost depends on the Career's skills.
 */
export function canReplaceCareer(entries: Pick<Entry, 'type'>[]) {
	return !entries.some((entry) => entry.type === EntryType.Skill);
}

/**
 * Raise a characteristic by one. Characteristics can only be raised during Character Creation.
 */
export function raiseCharacteristic(character: AdvancementCharacter, characteristic: Characteristic): AdvancementResult {
	const value = character.characteristics[characteristic];
	const cost = (value + 1) * XP_PER_CHARACTERISTIC_RATING;

	if (!isInCharacterCreation(character.entries) || value >= MAX_CHARACTERISTIC || availableXP(character.entries) < cost) {
		return refuse();
	}

	const actorUpdate: Record<string, unknown> = {
		[`system.characteristics.${characteristic}`]: value + 1,
		...thresholdUpdates(thresholdsOf(character), { [characteristic]: 1 }),
	};

	return planFor([...character.entries, { amount: -cost, type: EntryType.Characteristic, data: { characteristic, rank: value + 1 } }], {
		actorUpdate,
	});
}

function skillRankCost(skill: Pick<AdvancementSkill, 'rank' | 'career'>) {
	return XP_PER_SKILL_RANK * (skill.rank + 1) + (skill.career ? 0 : NON_CAREER_SKILL_EXTRA_XP);
}

/**
 * Buy the next rank of a skill. During Character Creation, bought ranks can't go above 2.
 */
export function buySkillRank(character: AdvancementCharacter, skillId: string): AdvancementResult {
	const skill = character.skills.find((candidate) => candidate.id === skillId);
	if (!skill) {
		return refuse();
	}

	const cost = skillRankCost(skill);
	if (skill.rank >= maxPurchasableSkillRank(character.entries) || availableXP(character.entries) < cost) {
		return refuse();
	}

	return planFor(
		[...character.entries, { amount: -cost, type: EntryType.Skill, data: { name: skill.name, id: skill.id, rank: skill.rank + 1 } }],
		{
			itemUpdates: [{ _id: skill.id, 'system.rank': skill.rank + 1 }],
		},
	);
}

/**
 * The XP cost of a talent, or a rank of one, bought at a tier.
 */
function talentCost(tier: number) {
	return tier * XP_PER_TALENT_TIER;
}

function talentPyramidRefusal(character: AdvancementCharacter, tier: number) {
	const totals = TalentPyramid.countTalentsPerTier(character.talents);
	if (character.houseRules.ignoreTalentPyramid || TalentPyramid.canAddTalentAtTier(totals, tier)) {
		return undefined;
	}

	return refuse('Genesys.Notifications.CannotPurchaseTalentTier', { tier, lowerTier: tier - 1, minimum: totals[tier] + 2 });
}

/**
 * Buy the next rank of a talent, at its next tier. With the Talent Tier Versions house rule, a rank is bought at the
 * tier of the version of the talent dropped on the character instead, and only that way.
 */
export function buyTalentRank(character: AdvancementCharacter, talentId: string, versionTier?: number): AdvancementResult {
	const talent = character.talents.find((candidate) => candidate.id === talentId);
	if (!talent) {
		return refuse();
	}

	if (talent.ranked === 'no') {
		return refuse('Genesys.Notifications.TalentNotRanked', { talentName: talent.name });
	}

	if (character.houseRules.talentTierVersions && versionTier === undefined) {
		return refuse();
	}

	const tier = character.houseRules.talentTierVersions ? versionTier! : effectiveNextTier(talent);
	const cost = talentCost(tier);
	const rank = talent.rank + 1;

	const pyramidRefusal = talentPyramidRefusal(character, tier);
	if (pyramidRefusal) {
		return pyramidRefusal;
	}

	if (availableXP(character.entries) < cost) {
		return refuse('Genesys.Notifications.CannotAffordRankedTalent', { name: talent.name, newRank: rank, cost });
	}

	return planFor(
		[...character.entries, { amount: -cost, type: EntryType.TalentRank, data: { name: talent.name, id: talent.id, tier, rank } }],
		{
			itemUpdates: [{ _id: talent.id, 'system.rank': rank }],
		},
	);
}

/**
 * Buy a talent dropped on the character: a rank of the talent of the same name if the character has it, the talent
 * itself otherwise, created with the given id.
 */
export function buyDroppedTalent(
	character: AdvancementCharacter,
	droppedTalent: { name: string; tier: number; source: object },
	newId: string,
): AdvancementResult {
	const heldTalent = character.talents.find((candidate) => candidate.name === droppedTalent.name);
	if (heldTalent) {
		return buyTalentRank(character, heldTalent.id, droppedTalent.tier);
	}

	const tier = droppedTalent.tier;
	const cost = talentCost(tier);

	const pyramidRefusal = talentPyramidRefusal(character, tier);
	if (pyramidRefusal) {
		return pyramidRefusal;
	}

	if (availableXP(character.entries) < cost) {
		return refuse('Genesys.Notifications.CannotAffordTalent', { name: droppedTalent.name, cost });
	}

	return planFor(
		[...character.entries, { amount: -cost, type: EntryType.NewTalent, data: { name: droppedTalent.name, id: newId, tier, rank: 1 } }],
		{
			itemCreates: [{ ...droppedTalent.source, _id: newId }],
		},
	);
}

/**
 * Award XP to the character, with the reason the Experience Journal records.
 */
export function awardXP(character: AdvancementCharacter, amount: number, reason: string): AdvancementResult {
	return planFor([...character.entries, { amount, type: EntryType.Award, data: { reason } }]);
}

/**
 * Undo an entry of the Experience Journal, along with what it bought. An Advancement can't be undone while a later
 * one builds on it.
 */
export function undoEntry(character: AdvancementCharacter, index: number): AdvancementResult {
	const entry = character.entries[index];
	if (!entry) {
		return refuse();
	}

	const entries = character.entries.filter((_, i) => i !== index);

	switch (entry.type) {
		case EntryType.Characteristic: {
			const characteristic = entry.data.characteristic;

			if (
				entries.some(
					(other) =>
						other.type === EntryType.Characteristic &&
						other.data.characteristic === characteristic &&
						other.data.rank > entry.data.rank,
				)
			) {
				return refuse('Genesys.Notifications.CannotDeleteCharacteristic', entry.data);
			}

			const actorUpdate: Record<string, unknown> = {
				[`system.characteristics.${characteristic}`]: entry.data.rank - 1,
				...thresholdUpdates(thresholdsOf(character), { [characteristic]: -1 }),
			};

			return planFor(entries, { actorUpdate });
		}

		case EntryType.Skill: {
			const skill = character.skills.find((candidate) => candidate.id === entry.data.id);
			if (!skill) {
				return planFor(entries);
			}

			if (
				entries.some((other) => other.type === EntryType.Skill && other.data.id === skill.id && other.data.rank > entry.data.rank)
			) {
				return refuse('Genesys.Notifications.CannotDeleteSkill', entry.data);
			}

			return planFor(entries, { itemUpdates: [{ _id: skill.id, 'system.rank': Math.max(0, skill.rank - 1) }] });
		}

		case EntryType.NewTalent:
		case EntryType.TalentRank: {
			const talent = character.talents.find((candidate) => candidate.id === entry.data.id);
			if (!talent) {
				return planFor(entries);
			}

			// Only the talent's latest rank can be undone.
			if (entry.data.rank !== talent.rank) {
				return refuse('Genesys.Notifications.CannotDeleteExistingTalent', entry.data);
			}

			const totals = TalentPyramid.countTalentsPerTier(character.talents);
			const tier = effectiveTier(talent);
			if (!character.houseRules.ignoreTalentPyramid && !TalentPyramid.canRemoveTalentAtTier(totals, tier)) {
				return refuse('Genesys.Notifications.CannotDeleteInvalidTalentPyramid', { rank: tier });
			}

			if (entry.type === EntryType.NewTalent) {
				return planFor(entries, { itemDeletes: [talent.id] });
			}

			return planFor(entries, { itemUpdates: [{ _id: talent.id, 'system.rank': talent.rank - 1 }] });
		}

		default:
			return planFor(entries);
	}
}

/**
 * The names of the items undoing an entry of the Experience Journal deletes, for the user to confirm first: the talent
 * its purchase brought. Empty when the undo deletes nothing, or is refused.
 */
export function itemsRemovedByUndo(character: AdvancementCharacter, index: number) {
	const result = undoEntry(character, index);
	if (!('plan' in result)) {
		return [];
	}

	const items = [...character.talents, ...character.skills];
	return result.plan.itemDeletes.flatMap((id) => items.find((item) => item.id === id)?.name ?? []);
}

/**
 * What Advancement needs to know about a character actor.
 */
export function advancementCharacter(actor: GenesysActor<CharacterDataModel>): AdvancementCharacter {
	const system = actor.systemData;

	// An Advancement prices, caps and writes the base ratings: an Active Effect only adds to them for a while, so it
	// keeps applying on top of the raised rating (CRB p. 44).
	return {
		entries: system.experienceJournal.entries,
		characteristics: system._source.characteristics as CharacteristicsContainer,
		woundThreshold: (system._source.wounds as CombatPool).max,
		strainThreshold: (system._source.strain as CombatPool).max,
		skills: (actor.items.filter((item) => item.type === 'skill') as GenesysItem<SkillDataModel>[]).map((skill) => ({
			id: skill.id,
			name: skill.name,
			rank: skill.systemData.rank,
			career: skill.systemData.career,
		})),
		talents: (actor.items.filter((item) => item.type === 'talent') as GenesysItem<TalentDataModel>[]).map((talent) => ({
			id: talent.id,
			name: talent.name,
			ranked: talent.systemData.ranked,
			tier: talent.systemData.tier,
			rank: talent.systemData.rank,
		})),
		houseRules: {
			ignoreTalentPyramid: CONFIG.genesys.settings.ignoreTalentPyramid,
			talentTierVersions: CONFIG.genesys.settings.talentTierVersions,
		},
	};
}

/**
 * Apply an Advancement to a character actor, or tell the user why it's refused. The Advancement is planned on what the
 * actor is now. Whether it was applied.
 */
export async function advance(actor: GenesysActor<CharacterDataModel>, change: (character: AdvancementCharacter) => AdvancementResult) {
	const result = change(advancementCharacter(actor));
	if (!('plan' in result)) {
		if (result.refusal) {
			notify(result.refusal);
		}
		return false;
	}

	await writeCharacter(actor, result.plan);
	return true;
}

/**
 * Make a change's writes on a character actor, one batch per kind of write: the items it creates, then those it updates
 * and deletes, then the character. Returns the created items.
 */
export async function writeCharacter(actor: GenesysActor<CharacterDataModel>, writes: CharacterWrites) {
	const { actorUpdate, itemCreates, itemUpdates, itemDeletes } = writes;

	let created: GenesysItem[] = [];
	if (itemCreates.length > 0) {
		created = (await actor.createEmbeddedDocuments('Item', itemCreates, { keepId: true })) as GenesysItem[];
	}
	if (itemUpdates.length > 0) {
		await actor.updateEmbeddedDocuments('Item', itemUpdates);
	}
	if (itemDeletes.length > 0) {
		await actor.deleteEmbeddedDocuments('Item', itemDeletes);
	}
	if (Object.keys(actorUpdate).length > 0) {
		await actor.update(actorUpdate);
	}

	return created;
}
