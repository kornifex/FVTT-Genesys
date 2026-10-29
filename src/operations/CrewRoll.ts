/** @file Rolls a skill for a vehicle by a crew member, picked in a prompt when several can roll it, as the CrewRoster module resolves them. */

import type { GenesysActor } from '@/actor/GenesysActor';
import { CrewMemberSkill, CrewSkill, crewMemberSkills } from '@/actor/data/CrewRoster';
import { DicePrompt, DicePromptOptions } from '@/app/DicePrompt';
import { SelectCrewMemberPrompt } from '@/app/SelectCrewMemberPrompt';
import { worldCheckRules } from '@/dice/Check';
import type { GenesysItem } from '@/item/GenesysItem';
import type { SkillDataModel } from '@/item/data/SkillDataModel';

/**
 * A skill a crew member rolls for the vehicle, resolved as a check of their actor.
 */
export type ActorCrewMemberSkill = CrewMemberSkill<GenesysActor, GenesysItem<SkillDataModel>>;

/**
 * The actors of crew members, by UUID. A member whose actor no longer exists is left out.
 */
export async function crewActors(members: string[]) {
	const actors = new Map<string, GenesysActor>();
	for (const member of new Set(members)) {
		const actor = await fromUuid<GenesysActor>(member);
		if (actor) {
			actors.set(member, actor);
		}
	}
	return actors;
}

/**
 * Open the dice prompt of a crew member rolling one of the crew skills: the only one who can, or the one picked in a
 * prompt. Warns when nobody can roll them, or when the user doesn't own the crew member.
 */
export async function rollForCrew(crewSkills: CrewSkill[], options: DicePromptOptions = {}) {
	const actors = await crewActors(crewSkills.map((crewSkill) => crewSkill.member));
	const memberSkills = crewMemberSkills(crewSkills, actors, worldCheckRules());
	if (memberSkills.length === 0) {
		ui.notifications.warn('Genesys.Notifications.NoRoleMembersWithAppropriateSkills', { localize: true });
		return;
	}

	const selected = memberSkills.length === 1 ? memberSkills[0] : await SelectCrewMemberPrompt.prompt(memberSkills);
	if (!selected) {
		return;
	}

	if (!selected.actor.isOwner) {
		ui.notifications.warn('Genesys.Notifications.CannotSelectActor', { localize: true });
		return;
	}

	await DicePrompt.promptForRoll(selected.actor, selected.skill.name, options);
}
