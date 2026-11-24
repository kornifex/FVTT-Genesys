/**
 * @file A character's Archetype, Career, skills, talents, abilities and Critical Injuries: the drops they receive.
 */

import {
	AdvancementCharacter,
	buyDroppedTalent,
	canReplaceCareer,
	CharacterWrites,
	isBarredMagicSkill,
} from '@/actor/data/character/Advancement';
import { ArchetypeGrants, archetypeChange, ArchetypeHolder, canRemoveArchetype } from '@/actor/data/character/Archetype';
import { careerChange, heldCareerSkills } from '@/actor/data/character/Career';
import { isOwnedSkill } from '@/data/Skills';
import type { Notification } from '@/notifications';
import { ofType } from '@/item/ItemTypes';

/**
 * An item the character owns, as this module reads it.
 */
export type CharacterItem = {
	id: string;
	name: string;
	type: string;
	system: unknown;
	flags?: Record<string, Record<string, unknown> | undefined>;
};

/**
 * What this module reads of a character.
 */
export type Character = {
	id: string | null;
	system: ArchetypeHolder;
	items: CharacterItem[];
	advancement: AdvancementCharacter;
};

/**
 * The item dropped on the character: its data, and the source it is copied from.
 */
export type DroppedItem = {
	type: string;
	name: string;
	system: unknown;
	source: { system?: object };
};

/**
 * The skills a drop asks the player to choose before it is written: those that get a Career's Free Ranks, as many as
 * the world settings give, or the different non-career skills that gain a rank from an Archetype, as many as it gives.
 */
export type SkillChoice = { kind: 'freeRanks' } | { kind: 'nonCareerSkills'; count: number };

/**
 * What a drop does to a character: refused, with what to tell the user if anything, the writes it makes, or a choice of
 * skills to make first, among the skills given.
 */
type CharacterDropDecision =
	| { action: 'refuse'; refusal?: Notification }
	| { action: 'write'; plan: CharacterWrites }
	| { action: 'chooseSkills'; choice: SkillChoice; skillIds: string[] };

type CareerData = { careerSkills: { name: string }[]; selectedSkillIDs: string[] };

function writing({
	itemCreates = [],
	itemUpdates = [],
	itemDeletes = [],
	actorUpdate = {},
}: Partial<CharacterWrites>): CharacterDropDecision {
	return { action: 'write', plan: { itemCreates, itemUpdates, itemDeletes, actorUpdate } };
}

function copy(dropped: DroppedItem, newId: () => string) {
	return writing({ itemCreates: [{ ...dropped.source, _id: newId() }] });
}

/**
 * Buy a dropped talent, or a rank of the one the character owns, at the tier it is dropped at.
 */
function talentDrop(character: Character, dropped: DroppedItem, id: string): CharacterDropDecision {
	const { tier } = dropped.system as { tier: number };
	const result = buyDroppedTalent(character.advancement, { name: dropped.name, tier, source: dropped.source }, id);
	return 'plan' in result ? { action: 'write', plan: result.plan } : { action: 'refuse', refusal: result.refusal };
}

/**
 * Decide what dropping an item does to a character, drawing the ids of the items it creates. A Career first asks for the
 * skills that get its Free Ranks, and an Archetype with non-career skill choices for those skills: the decision is made
 * again with the chosen skills, none when the player closed the window. Equipment goes to the character's inventory
 * instead.
 */
export function decideCharacterDrop(
	character: Character,
	dropped: DroppedItem,
	newId: () => string,
	chosenSkillIds?: string[],
): CharacterDropDecision {
	switch (dropped.type) {
		case 'skill': {
			// A character never owns a skill twice, whatever the case of its name.
			return isOwnedSkill(ofType(character.items, 'skill'), dropped) ? { action: 'refuse' } : copy(dropped, newId);
		}
		// A spell is owned as it is written, as an ability is: the same spell dropped twice is owned twice.
		case 'ability':
		case 'injury':
		case 'spell':
			return copy(dropped, newId);
		case 'archetype': {
			// The Archetype can only be changed while the Experience Journal holds nothing but its Starting XP.
			if (!canRemoveArchetype(character.system)) {
				return { action: 'refuse', refusal: { key: 'Genesys.Notifications.CannotReplaceArchetype', data: { name: dropped.name } } };
			}

			// The dropped item's type tells its data: Foundry built it with the Archetype's DataModel, which fills every field.
			const system = dropped.system as ArchetypeGrants;
			// The skills are judged now, before the Career: the Core Rulebook has the archetype picked first (CRB p. 35), so a
			// Career that later lists a chosen skill makes it a career skill, and the rank stays.
			if (system.nonCareerSkillChoices > 0 && !chosenSkillIds) {
				const { alternateRules } = character.advancement;
				const offered = character.advancement.skills.filter((skill) => !skill.career && !isBarredMagicSkill(skill, alternateRules));
				return {
					action: 'chooseSkills',
					choice: { kind: 'nonCareerSkills', count: system.nonCareerSkillChoices },
					skillIds: offered.map((skill) => skill.id),
				};
			}

			const [held] = ofType(character.items, 'archetype');
			return writing(archetypeChange(character, held, { system, source: dropped.source }, chosenSkillIds ?? [], newId));
		}
		case 'career': {
			// A Career can be replaced until a skill rank is bought, since that rank's cost depends on the Career's skills.
			if (!canReplaceCareer(character.advancement.entries)) {
				return { action: 'refuse', refusal: { key: 'Genesys.Notifications.CannotReplaceCareer', data: { name: dropped.name } } };
			}

			const system = dropped.system as Pick<CareerData, 'careerSkills'>;
			if (!chosenSkillIds) {
				return {
					action: 'chooseSkills',
					choice: { kind: 'freeRanks' },
					skillIds: heldCareerSkills(character.items, system.careerSkills).map((skill) => skill.id),
				};
			}

			const [held] = ofType(character.items, 'career');
			return writing(careerChange(character.items, held, { system, source: dropped.source }, chosenSkillIds, newId));
		}
		case 'talent':
			return talentDrop(character, dropped, newId());
		default:
			return { action: 'refuse' };
	}
}
