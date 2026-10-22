/** @file An adversary's skills, talents and abilities: the drops they receive, and the ranks of its talents. */

import { ownedSkill, Skill } from '@/data/Skills';
import type { Notification } from '@/notifications';

/**
 * What this module reads of an adversary: its type, and the skills, talents and abilities it owns.
 */
export type Adversary = {
	type: string;
	skills: (Skill & { id: string })[];
	talents: Talent[];
	abilities: { name: string }[];
};

type Talent = { id: string; name: string; system: { ranked: 'yes' | 'no'; rank: number } };

/**
 * A refused change, with what to tell the user if anything.
 */
type Refusal = { action: 'refuse'; refusal?: Notification };

/**
 * A new rank for an item the adversary owns.
 */
type RankUpdate = { _id: string; system: { rank: number } };

/**
 * What a drop does to an adversary: create the dropped item, at a rank when given, raise the rank of an item it owns, or
 * be refused.
 */
type AdversaryDropDecision = { action: 'create'; rank?: number } | { action: 'update'; update: RankUpdate } | Refusal;

/**
 * What a change of a talent's rank does: update its rank, delete the talent at rank 0, or be refused.
 */
type TalentRankChange = { action: 'update'; update: RankUpdate } | { action: 'delete'; id: string } | Refusal;

// Characters refuse the ranks of a non-ranked talent too, with the same notification.
function talentNotRanked(talent: Talent): Refusal {
	return { action: 'refuse', refusal: { key: 'Genesys.Notifications.TalentNotRanked', data: { talentName: talent.name } } };
}

function raiseRank(item: { id: string; system: { rank: number } }): RankUpdate {
	return { _id: item.id, system: { rank: item.system.rank + 1 } };
}

function skillDrop(adversary: Adversary, name: string): AdversaryDropDecision {
	// A Minion Group's skills have no rank of their own: they roll at the group's rank.
	const isMinion = adversary.type === 'minion';
	const owned = ownedSkill(adversary.skills, name);
	if (owned) {
		return isMinion ? { action: 'refuse' } : { action: 'update', update: raiseRank(owned) };
	}

	return isMinion ? { action: 'create' } : { action: 'create', rank: 1 };
}

function talentDrop(adversary: Adversary, name: string): AdversaryDropDecision {
	const owned = adversary.talents.find((talent) => talent.name === name);
	if (!owned) {
		return { action: 'create' };
	}

	return owned.system.ranked === 'yes' ? { action: 'update', update: raiseRank(owned) } : talentNotRanked(owned);
}

/**
 * Decide what dropping a skill, talent, ability or Critical Injury on an adversary does. Equipment goes to its inventory
 * instead.
 */
export function decideAdversaryDrop(adversary: Adversary, dropped: { type: string; name: string }): AdversaryDropDecision {
	switch (dropped.type) {
		case 'skill':
			return skillDrop(adversary, dropped.name);
		case 'talent':
			return talentDrop(adversary, dropped.name);
		case 'ability':
			return adversary.abilities.some((ability) => ability.name === dropped.name) ? { action: 'refuse' } : { action: 'create' };
		case 'injury':
			return { action: 'create' };
		default:
			return { action: 'refuse' };
	}
}

/**
 * Change the rank of an adversary's talent by one step.
 */
export function talentRankChange(talent: Talent, step: 1 | -1): TalentRankChange {
	if (talent.system.ranked === 'no') {
		return talentNotRanked(talent);
	}

	const rank = talent.system.rank + step;
	if (rank <= 0) {
		return { action: 'delete', id: talent.id };
	}

	return { action: 'update', update: { _id: talent.id, system: { rank } } };
}
