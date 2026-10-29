/** @file The prompt that picks the crew member who rolls a skill for a vehicle, when several can. */

import { VuePrompt } from '@/vue/VuePrompt';
import VueSelectCrewMemberPrompt from '@/vue/apps/SelectCrewMemberPrompt.vue';

import type { ActorCrewMemberSkill } from '@/operations/CrewRoll';

/**
 * What the crew member prompt shows: the crew members' skills to pick from.
 */
export type SelectCrewMemberPromptContext = {
	memberSkills: ActorCrewMemberSkill[];
	answer: (selected: ActorCrewMemberSkill) => void;
};

export class SelectCrewMemberPrompt extends VuePrompt<ActorCrewMemberSkill | undefined>(undefined) {
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
	static async prompt(memberSkills: ActorCrewMemberSkill[]) {
		return new SelectCrewMemberPrompt(memberSkills).prompt();
	}

	readonly memberSkills: ActorCrewMemberSkill[];

	constructor(memberSkills: ActorCrewMemberSkill[]) {
		super();

		this.memberSkills = memberSkills;
	}

	override async getVueContext(): Promise<SelectCrewMemberPromptContext> {
		return {
			memberSkills: this.memberSkills,
			answer: (selected) => this.answer(selected),
		};
	}
}
