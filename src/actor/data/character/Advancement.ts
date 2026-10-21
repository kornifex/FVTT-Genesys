/**
 * @file Advancement: spending XP on a characteristic, a skill rank, or a talent or a rank of one, and undoing it from the Experience Journal. Every change to the Experience Journal goes through this module.
 */

import type GenesysActor from '@/actor/GenesysActor';
import type CharacterDataModel from '@/actor/data/CharacterDataModel';
import { Entry, EntryType } from '@/actor/data/character/ExperienceJournal';
import { isInCharacterCreation, maxPurchasableSkillRank } from '@/actor/data/character/CharacterCreation';
import * as TalentPyramid from '@/actor/data/character/TalentPyramid';
import { Characteristic, CharacteristicsContainer } from '@/data/Characteristics';
import type { CombatPool } from '@/data/Actors';
import type GenesysItem from '@/item/GenesysItem';
import type SkillDataModel from '@/item/data/SkillDataModel';
import type TalentDataModel from '@/item/data/TalentDataModel';

/**
 * The highest value a characteristic can be raised to.
 */
const MAX_CHARACTERISTIC = 5;

type AdvancementSkill = {
	id: string;
	name: string;
	rank: number;
	career: boolean;
};

export type AdvancementTalent = {
	id: string;
	name: string;
	ranked: 'yes' | 'no';
	tier: number;
	rank: number;
	effectiveTier: number;
	effectiveNextTier: number;
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
 * The changes an Advancement makes to the character and its items.
 */
type AdvancementPlan = {
	actorUpdate: Record<string, unknown>;
	itemCreates: Record<string, unknown>[];
	itemUpdates: ({ _id: string } & Record<string, unknown>)[];
	itemDeletes: string[];
};

/**
 * A notification to show the user, as a localization key and its format arguments.
 */
type Notification = {
	key: string;
	data?: Record<string, unknown>;
};

/**
 * An Advancement's plan, or why it is refused, with what to tell the user if anything.
 */
export type AdvancementResult = { plan: AdvancementPlan } | { refusal: Notification | undefined };

function refuse(key?: string, data?: Record<string, unknown>): AdvancementResult {
	return { refusal: key ? { key, data } : undefined };
}

function planFor(entries: Entry[], { actorUpdate = {}, itemCreates = [], itemUpdates = [], itemDeletes = [] }: Partial<AdvancementPlan> = {}): AdvancementResult {
	return {
		plan: {
			actorUpdate: { ...actorUpdate, 'system.experienceJournal.entries': entries },
			itemCreates,
			itemUpdates,
			itemDeletes,
		},
	};
}

export function isAllowed(result: AdvancementResult) {
	return 'plan' in result;
}

export function availableXP(entries: Pick<Entry, 'amount'>[]) {
	return entries.reduce((total, entry) => total + entry.amount, 0);
}

/**
 * The Experience Journal with the Archetype's Starting XP, which is always its first entry.
 */
export function withStartingXP(entries: Entry[], amount: number): Entry[] {
	return [{ amount, type: EntryType.Starting }, ...entries];
}

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
	const cost = (value + 1) * 10;

	if (!isInCharacterCreation(character.entries) || value >= MAX_CHARACTERISTIC || availableXP(character.entries) < cost) {
		return refuse();
	}

	const actorUpdate: Record<string, unknown> = { [`system.characteristics.${characteristic}`]: value + 1 };
	if (characteristic === Characteristic.Brawn) {
		actorUpdate['system.wounds.max'] = character.woundThreshold + 1;
	} else if (characteristic === Characteristic.Willpower) {
		actorUpdate['system.strain.max'] = character.strainThreshold + 1;
	}

	return planFor([...character.entries, { amount: -cost, type: EntryType.Characteristic, data: { characteristic, rank: value + 1 } }], { actorUpdate });
}

function skillRankCost(skill: Pick<AdvancementSkill, 'rank' | 'career'>) {
	return 5 * (skill.rank + 1) + (skill.career ? 0 : 5);
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

	return planFor([...character.entries, { amount: -cost, type: EntryType.Skill, data: { name: skill.name, id: skill.id, rank: skill.rank + 1 } }], {
		itemUpdates: [{ _id: skill.id, 'system.rank': skill.rank + 1 }],
	});
}

/**
 * A talent, or a rank of one, costs 5 XP per tier it's bought at.
 */
function talentCost(tier: number) {
	return tier * 5;
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

	const tier = character.houseRules.talentTierVersions ? versionTier! : talent.effectiveNextTier;
	const cost = talentCost(tier);
	const rank = talent.rank + 1;

	const pyramidRefusal = talentPyramidRefusal(character, tier);
	if (pyramidRefusal) {
		return pyramidRefusal;
	}

	if (availableXP(character.entries) < cost) {
		return refuse('Genesys.Notifications.CannotAffordRankedTalent', { name: talent.name, newRank: rank, cost });
	}

	return planFor([...character.entries, { amount: -cost, type: EntryType.TalentRank, data: { name: talent.name, id: talent.id, tier, rank } }], {
		itemUpdates: [{ _id: talent.id, 'system.rank': rank }],
	});
}

/**
 * Buy a talent dropped on the character: a rank of the talent of the same name if the character has it, the talent
 * itself otherwise, created with the given id.
 */
export function buyDroppedTalent(character: AdvancementCharacter, droppedTalent: { name: string; tier: number; source: object }, newId: string): AdvancementResult {
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

	return planFor([...character.entries, { amount: -cost, type: EntryType.NewTalent, data: { name: droppedTalent.name, id: newId, tier, rank: 1 } }], {
		itemCreates: [{ ...droppedTalent.source, _id: newId }],
	});
}

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

			if (entries.some((other) => other.type === EntryType.Characteristic && other.data.characteristic === characteristic && other.data.rank > entry.data.rank)) {
				return refuse('Genesys.Notifications.CannotDeleteCharacteristic', entry.data);
			}

			const actorUpdate: Record<string, unknown> = { [`system.characteristics.${characteristic}`]: entry.data.rank - 1 };
			if (characteristic === Characteristic.Brawn) {
				actorUpdate['system.wounds.max'] = character.woundThreshold - 1;
			} else if (characteristic === Characteristic.Willpower) {
				actorUpdate['system.strain.max'] = character.strainThreshold - 1;
			}

			return planFor(entries, { actorUpdate });
		}

		case EntryType.Skill: {
			const skill = character.skills.find((candidate) => candidate.id === entry.data.id);
			if (!skill) {
				return planFor(entries);
			}

			if (entries.some((other) => other.type === EntryType.Skill && other.data.id === skill.id && other.data.rank > entry.data.rank)) {
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
			if (!character.houseRules.ignoreTalentPyramid && !TalentPyramid.canRemoveTalentAtTier(totals, talent.effectiveTier)) {
				return refuse('Genesys.Notifications.CannotDeleteInvalidTalentPyramid', { rank: talent.effectiveTier });
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
 * What Advancement needs to know about a character actor.
 */
export function advancementCharacter(actor: GenesysActor<CharacterDataModel>): AdvancementCharacter {
	const system = actor.systemData;

	return {
		entries: system.experienceJournal.entries,
		characteristics: system.characteristics,
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
			effectiveTier: talent.systemData.effectiveTier,
			effectiveNextTier: talent.systemData.effectiveNextTier,
		})),
		houseRules: {
			ignoreTalentPyramid: CONFIG.genesys.settings.ignoreTalentPyramid,
			talentTierVersions: CONFIG.genesys.settings.talentTierVersions,
		},
	};
}

/**
 * Apply an Advancement to a character actor, or tell the user why it's refused. Whether it was applied.
 */
export async function advance(actor: GenesysActor<CharacterDataModel>, result: AdvancementResult) {
	if (!('plan' in result)) {
		if (result.refusal) {
			ui.notifications.info(game.i18n.format(result.refusal.key, result.refusal.data as Record<string, string>));
		}
		return false;
	}

	const { actorUpdate, itemCreates, itemUpdates, itemDeletes } = result.plan;

	if (itemCreates.length > 0) {
		await actor.createEmbeddedDocuments('Item', itemCreates, { keepId: true });
	}
	if (itemUpdates.length > 0) {
		await actor.updateEmbeddedDocuments('Item', itemUpdates);
	}
	if (itemDeletes.length > 0) {
		await actor.deleteEmbeddedDocuments('Item', itemDeletes);
	}

	await actor.update(actorUpdate);

	return true;
}
