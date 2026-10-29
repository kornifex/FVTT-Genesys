/**
 * @file A character's Archetype, Career, skills, talents, abilities and Critical Injuries: the drops they receive.
 */

import { AdvancementCharacter, buyDroppedTalent, canReplaceCareer, CharacterWrites } from '@/actor/data/character/Advancement';
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
 * What a drop does to a character: refused, with what to tell the user if anything, the writes it makes, or, for a
 * Career, a choice of the skills that get its Free Ranks to make first.
 */
type CharacterDropDecision =
	| { action: 'refuse'; refusal?: Notification }
	| { action: 'write'; plan: CharacterWrites }
	| { action: 'chooseFreeRanks'; skillIds: string[] };

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
 * skills that get its Free Ranks: the decision is made again with them. Equipment goes to the character's inventory
 * instead.
 */
export function decideCharacterDrop(
	character: Character,
	dropped: DroppedItem,
	newId: () => string,
	freeRankSkillIds?: string[],
): CharacterDropDecision {
	switch (dropped.type) {
		case 'skill': {
			// A character never owns a skill twice, whatever the case of its name.
			return isOwnedSkill(ofType(character.items, 'skill'), dropped) ? { action: 'refuse' } : copy(dropped, newId);
		}
		case 'ability':
		case 'injury':
			return copy(dropped, newId);
		case 'archetype': {
			// The Archetype can only be changed while the Experience Journal holds nothing but its Starting XP.
			if (!canRemoveArchetype(character.system)) {
				return { action: 'refuse' };
			}

			const [held] = ofType(character.items, 'archetype');
			return writing(archetypeChange(character, held, { system: dropped.system as ArchetypeGrants, source: dropped.source }, newId));
		}
		case 'career': {
			// A Career can be replaced until a skill rank is bought, since that rank's cost depends on the Career's skills.
			if (!canReplaceCareer(character.advancement.entries)) {
				return { action: 'refuse' };
			}

			const system = dropped.system as Pick<CareerData, 'careerSkills'>;
			if (!freeRankSkillIds) {
				return {
					action: 'chooseFreeRanks',
					skillIds: heldCareerSkills(character.items, system.careerSkills).map((skill) => skill.id),
				};
			}

			const [held] = ofType(character.items, 'career');
			return writing(careerChange(character.items, held, { system, source: dropped.source }, freeRankSkillIds, newId));
		}
		case 'talent':
			return talentDrop(character, dropped, newId());
		default:
			return { action: 'refuse' };
	}
}
