/** @file The prompt that picks the crew member who rolls a skill for a vehicle, when several can. */

import { VueSheet } from '@/vue/VueSheet';
import VueSelectCrewMemberPrompt from '@/vue/apps/SelectCrewMemberPrompt.vue';

import type { ActorCrewMemberSkill } from '@/operations/CrewRoll';

/**
 * What the crew member prompt shows: the crew members' skills to pick from.
 */
export type SelectCrewMemberPromptContext = {
	memberSkills: ActorCrewMemberSkill[];
	resolvePromise: (selected: ActorCrewMemberSkill) => void;
};

export class SelectCrewMemberPrompt extends VueSheet(foundry.applications.api.ApplicationV2) {
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
		const sheet = new SelectCrewMemberPrompt(memberSkills);
		await sheet.render(true);

		return new Promise<ActorCrewMemberSkill | undefined>((resolve) => {
			sheet.#resolvePromise = resolve;
		});
	}

	readonly memberSkills: ActorCrewMemberSkill[];
	#resolvePromise?: (selected?: ActorCrewMemberSkill) => void;

	constructor(memberSkills: ActorCrewMemberSkill[]) {
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
