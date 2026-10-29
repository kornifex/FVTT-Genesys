/**
 * @file Adding and removing a character's Archetype, and the items an Archetype grants.
 */

import type { GenesysActor } from '@/actor/GenesysActor';
import type { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import type { ArchetypeDataModel } from '@/item/data/ArchetypeDataModel';
import type { GenesysItem } from '@/item/GenesysItem';
import type { SkillDataModel } from '@/item/data/SkillDataModel';
import { Entry } from '@/actor/data/character/ExperienceJournal';
import { withStartingXP, withoutStartingXP } from '@/actor/data/character/Advancement';
import { Characteristic, CharacteristicsContainer } from '@/data/Characteristics';
import { ownedSkill, skillNamesMatch } from '@/data/Skills';

/**
 * Whether the Archetype is being added to the character (+1) or removed from it (-1).
 */
export type ArchetypeSign = 1 | -1;

/**
 * What an Archetype grants, as the computations below read it.
 */
export type ArchetypeGrants = {
	characteristics: CharacteristicsContainer;
	woundThreshold: number;
	strainThreshold: number;
	startingXP: number;
	grantedItems: { name: string; type: string; flags?: Flags }[];
};

/**
 * The flags of a document, by scope.
 */
type Flags = Record<string, Record<string, unknown> | undefined>;

/**
 * What the computations below read from the character.
 */
export type ArchetypeHolder = {
	characteristics: CharacteristicsContainer;
	wounds: { max: number };
	strain: { max: number };
	experienceJournal: { entries: Entry[] };
};

/**
 * What the computations below read from an item owned by the character.
 */
export type HeldItem = {
	name: string;
	type: string;
	system: unknown;
	flags?: Flags;
};

/**
 * The `genesys` flag of an item an Archetype granted, which holds the id of the character it was granted to.
 */
const FLAG_ARCHETYPE_GRANT = 'archetypeGrant';

/**
 * The character with an Archetype added (sign +1) or removed (sign -1): characteristics, wound and strain thresholds, and
 * the Starting XP entry at the head of the Experience Journal.
 */
function withArchetype(character: ArchetypeHolder, archetype: ArchetypeGrants, sign: ArchetypeSign): ArchetypeHolder {
	const characteristics = { ...character.characteristics };
	for (const characteristic of Object.values(Characteristic)) {
		characteristics[characteristic] += sign * archetype.characteristics[characteristic];
	}

	return {
		characteristics,
		// Each threshold is the Archetype's base, raised by its Brawn or Willpower.
		wounds: { max: character.wounds.max + sign * (archetype.woundThreshold + archetype.characteristics.brawn) },
		strain: { max: character.strain.max + sign * (archetype.strainThreshold + archetype.characteristics.willpower) },
		// Starting XP is always the first entry of the Experience Journal.
		experienceJournal: {
			entries:
				sign > 0
					? withStartingXP(character.experienceJournal.entries, archetype.startingXP)
					: withoutStartingXP(character.experienceJournal.entries),
		},
	};
}

function toActorUpdate(character: ArchetypeHolder): Record<string, unknown> {
	const update: Record<string, unknown> = {};
	for (const characteristic of Object.values(Characteristic)) {
		update[`system.characteristics.${characteristic}`] = character.characteristics[characteristic];
	}

	update['system.wounds.max'] = character.wounds.max;
	update['system.strain.max'] = character.strain.max;
	update['system.experienceJournal.entries'] = character.experienceJournal.entries;
	return update;
}

/**
 * The actor update for adding (sign +1) or removing (sign -1) an Archetype: characteristics, wound and strain
 * thresholds, and the Starting XP entry at the head of the Experience Journal.
 */
export function archetypeActorUpdate(character: ArchetypeHolder, archetype: ArchetypeGrants, sign: ArchetypeSign): Record<string, unknown> {
	return toActorUpdate(withArchetype(character, archetype, sign));
}

/**
 * Items granted by the Archetype that are added to the character as embedded items, i.e. everything but skills.
 */
export function grantedNonSkills<T extends ArchetypeGrants['grantedItems'][number]>(grantedItems: T[]) {
	return grantedItems.filter((i) => i && i.type !== 'skill');
}

/**
 * Whether the Archetype already grants an item: one of the same type and name, a skill's name matching whatever its
 * case.
 */
export function grantsItem(grantedItems: ArchetypeGrants['grantedItems'], item: { type: string; name: string }) {
	return grantedItems.some(
		(granted) =>
			granted.type === item.type && (item.type === 'skill' ? skillNamesMatch(granted.name, item.name) : granted.name === item.name),
	);
}

/**
 * Names of the skills granted by the Archetype.
 */
function grantedSkillNames(grantedItems: ArchetypeGrants['grantedItems']) {
	return grantedItems.filter((i) => i && i.type === 'skill').map((s) => s.name);
}

/**
 * The data of a granted non-skill as it is embedded in the character: flagged with the character's id, which
 * replaces the one a copied grant may hold, and keeping its other flags.
 */
function flaggedGrant<T extends ArchetypeGrants['grantedItems'][number]>(grantedItem: T, actorId: string | null) {
	return {
		...grantedItem,
		flags: { ...grantedItem.flags, genesys: { ...grantedItem.flags?.genesys, [FLAG_ARCHETYPE_GRANT]: actorId } },
	};
}

/**
 * Items of the character that its Archetype granted as embedded items, and are deleted along with it: the non-skills
 * whose flag holds the character's id. A character holding none, because it got its Archetype before the flag or was
 * duplicated or imported under a new id, gets one held item per granted non-skill, of the same type and name.
 */
export function heldNonSkillsGrantedBy<T extends HeldItem>(
	items: T[],
	grantedItems: ArchetypeGrants['grantedItems'],
	actorId: string | null,
) {
	const nonSkills = items.filter((i) => i.type !== 'skill');
	const flagged = nonSkills.filter((i) => i.flags?.genesys?.[FLAG_ARCHETYPE_GRANT] === actorId);
	if (flagged.length > 0) {
		return flagged;
	}

	const unmatched = [...nonSkills];
	return grantedNonSkills(grantedItems).flatMap((granted) => {
		const index = unmatched.findIndex((i) => i.type === granted.type && i.name === granted.name);
		return index < 0 ? [] : unmatched.splice(index, 1);
	});
}

/**
 * The rank updates of the character's skills granted by the Archetype, which gain (sign +1) or lose (sign -1) a rank.
 * Each granted skill is the one the character rolls for its name.
 */
export function grantedSkillRankUpdates<T extends HeldItem>(
	items: T[],
	grantedItems: ArchetypeGrants['grantedItems'],
	sign: ArchetypeSign,
) {
	const skills = items.filter((i) => i.type === 'skill') as (T & { system: SkillDataModel })[];
	const grantedSkills = new Set(grantedSkillNames(grantedItems).flatMap((name) => ownedSkill(skills, name) ?? []));

	return [...grantedSkills].map((skill) => ({
		skill,
		update: {
			'system.rank': skill.system.rank + sign,
		},
	}));
}

/**
 * The writes that give the character an Archetype, in place of the one they hold if any: what the held Archetype gave
 * is taken back, then what the new one grants is given, and its granted non-skills and the Archetype item itself are
 * created under the ids drawn. Each kind of write is one batch, so a granted skill both Archetypes grant keeps its rank.
 */
export function archetypeChange<T extends HeldItem & { id: string }>(
	character: { id: string | null; system: ArchetypeHolder; items: T[] },
	held: { id: string; system: ArchetypeGrants } | undefined,
	dropped: { system: ArchetypeGrants; source: object },
	newId: () => string,
) {
	let holder = character.system;
	let items = character.items;
	const itemDeletes: string[] = [];
	const ranks = new Map<string, number>();
	const changeRanks = (archetype: ArchetypeGrants, sign: ArchetypeSign) => {
		for (const { skill, update } of grantedSkillRankUpdates(items, archetype.grantedItems, sign)) {
			ranks.set(skill.id, update['system.rank']);
		}
		items = items.map((item) =>
			ranks.has(item.id) ? { ...item, system: { ...(item.system as object), rank: ranks.get(item.id) } } : item,
		);
	};

	if (held) {
		holder = withArchetype(holder, held.system, -1);
		itemDeletes.push(
			...heldNonSkillsGrantedBy(character.items, held.system.grantedItems, character.id).map((item) => item.id),
			held.id,
		);
		changeRanks(held.system, -1);
	}

	changeRanks(dropped.system, 1);
	const rankOf = (id: string) => (character.items.find((item) => item.id === id)?.system as { rank: number }).rank;

	return {
		itemCreates: [
			...grantedNonSkills(dropped.system.grantedItems).map((grantedItem) => ({
				...flaggedGrant(grantedItem, character.id),
				_id: newId(),
			})),
			{ ...dropped.source, _id: newId() },
		],
		itemUpdates: [...ranks].filter(([id, rank]) => rank !== rankOf(id)).map(([id, rank]) => ({ _id: id, 'system.rank': rank })),
		itemDeletes,
		actorUpdate: toActorUpdate(withArchetype(holder, dropped.system, 1)),
	};
}

/**
 * The Archetype can only be changed while the Experience Journal holds nothing but its Starting XP.
 */
export function canRemoveArchetype(character: Pick<ArchetypeHolder, 'experienceJournal'>) {
	return character.experienceJournal.entries.length <= 1;
}

/**
 * Remove everything an Archetype added to the character, then delete the Archetype item.
 */
export async function removeArchetype(actor: GenesysActor<CharacterDataModel>, archetype: GenesysItem<ArchetypeDataModel>) {
	const archetypeData = archetype.systemData;
	const actorUpdate = archetypeActorUpdate(actor.systemData, archetypeData, -1);

	// Non-skills are embedded items & need to be deleted.
	await Promise.all(
		heldNonSkillsGrantedBy(actor.items.contents, archetypeData.grantedItems, actor.id).map(async (i) => await i.delete()),
	);

	// Skills get reduced by 1 rank.
	await Promise.all(
		grantedSkillRankUpdates(actor.items.contents, archetypeData.grantedItems, -1).map(
			async ({ skill, update }) => await skill.update(update),
		),
	);

	await actor.update(actorUpdate);

	await archetype.delete();
}
