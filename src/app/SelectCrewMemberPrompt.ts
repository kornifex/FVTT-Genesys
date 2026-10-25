/** @file Rolling a skill for a vehicle by a crew member, picked in a prompt when several can roll it. */

import { ContextBase } from '@/vue/SheetContext';
import { VueSheet } from '@/vue/VueSheet';
import VueSelectCrewMemberPrompt from '@/vue/apps/SelectCrewMemberPrompt.vue';

import { GenesysActor } from '@/actor/GenesysActor';
import { CrewSkill } from '@/actor/data/CrewRoster';
import { GenesysItem } from '@/item/GenesysItem';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import { resolveCheck, worldCheckRules } from '@/dice/Check';
import { DicePrompt, DicePromptOptions } from '@/app/DicePrompt';

/**
 * A skill a crew member rolls for the vehicle, resolved as a check.
 */
export type CrewMemberSkill = CrewSkill & {
	actor: GenesysActor;
	skill: GenesysItem<SkillDataModel>;
	rank: number;
	characteristicValue: number;
};

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
 * The crew skills resolved as checks of their members' actors. A skill whose member isn't among the actors, or who can
 * roll it neither as an owned skill nor as an Unranked Skill Check, is left out.
 */
export function crewMemberSkills(crewSkills: CrewSkill[], actors: Map<string, GenesysActor>): CrewMemberSkill[] {
	const rules = worldCheckRules();
	return crewSkills.flatMap((crewSkill) => {
		const actor = actors.get(crewSkill.member);
		const check = actor && resolveCheck(actor, { skillName: crewSkill.skillName }, rules);
		return actor && check?.skill
			? [{ ...crewSkill, actor, skill: check.skill, rank: check.rank, characteristicValue: check.characteristicValue }]
			: [];
	});
}

/**
 * Open the dice prompt of a crew member rolling one of the crew skills: the only one who can, or the one picked in a
 * prompt. Warns when nobody can roll them, or when the user doesn't own the crew member.
 */
export async function rollForCrew(crewSkills: CrewSkill[], options: DicePromptOptions = {}) {
	const memberSkills = crewMemberSkills(crewSkills, await crewActors(crewSkills.map((crewSkill) => crewSkill.member)));
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

/**
 * What the crew member prompt shows: the crew members' skills to pick from.
 */
export type SelectCrewMemberPromptContext = ContextBase & {
	memberSkills: CrewMemberSkill[];
	resolvePromise: (selected: CrewMemberSkill) => void;
};

class SelectCrewMemberPrompt extends VueSheet(foundry.applications.api.ApplicationV2) {
	override get vueComponent() {
		return VueSelectCrewMemberPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-select-crew-member-prompt'],
		position: { width: 100 },
		window: { title: 'Genesys.CrewMemberPrompt.Title' },
	};

	/**
	 * Ask the user to pick one of the crew members' skills. Undefined when the prompt is closed.
	 */
	static async prompt(memberSkills: CrewMemberSkill[]) {
		const sheet = new SelectCrewMemberPrompt(memberSkills);
		await sheet.render(true);

		return new Promise<CrewMemberSkill | undefined>((resolve) => {
			sheet.#resolvePromise = resolve;
		});
	}

	readonly memberSkills: CrewMemberSkill[];
	#resolvePromise?: (selected?: CrewMemberSkill) => void;

	constructor(memberSkills: CrewMemberSkill[]) {
		super();

		this.memberSkills = memberSkills;
	}

	override async getVueContext(): Promise<SelectCrewMemberPromptContext> {
		return {
			memberSkills: this.memberSkills,
			resolvePromise: (selected) => {
				this.#resolvePromise?.(selected);
				this.#resolvePromise = undefined;

				void this.close();
			},
		};
	}

	protected override async _preClose(options: object) {
		this.#resolvePromise?.();
		await super._preClose(options);
	}
}
