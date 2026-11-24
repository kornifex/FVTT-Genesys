import type { SkillChoice } from '@/actor/data/character/CharacterItems';
import type { Stored } from '@/data/Stored';
import { GenesysItem } from '@/item/GenesysItem';
import VueCareerSkillPrompt from '@/vue/apps/CareerSkillPrompt.vue';
import { VuePrompt } from '@/vue/VuePrompt';

/**
 * What the career skill prompt shows: the skills to pick from, how many different skills to pick, and the localization
 * key of the hint above them.
 */
export type CareerSkillPromptContext = {
	skills: Stored<GenesysItem<'skill'>>[];
	count: number;
	hint: string;
};

/**
 * The localization keys of the window's title and hint, for each choice of skills it asks for.
 */
const CHOICE_TEXTS: Record<SkillChoice['kind'], { title: string; hint: string }> = {
	freeRanks: { title: 'Genesys.CareerSkillPrompt.Title', hint: 'Genesys.CareerSkillPrompt.Hint' },
	nonCareerSkills: { title: 'Genesys.CareerSkillPrompt.NonCareerTitle', hint: 'Genesys.CareerSkillPrompt.NonCareerHint' },
};

/**
 * Prompt the user for the skills that gain a free rank: a Career's Free Ranks, or an Archetype's non-career skills.
 */
export class CareerSkillPrompt extends VuePrompt<string[]>([]) {
	override get vueComponent() {
		return VueCareerSkillPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-career-skill-prompt'],
		position: { width: 400 },
	};

	/**
	 * Ask the user to pick skills for a choice, by their IDs: the Career's Free Ranks, as many as the world settings give,
	 * or as many non-career skills as the Archetype gives. None when the prompt is closed.
	 */
	static async promptForSkills(skills: Stored<GenesysItem<'skill'>>[], choice: SkillChoice) {
		return new CareerSkillPrompt(skills, choice).prompt();
	}

	readonly #skills: Stored<GenesysItem<'skill'>>[];

	readonly #choice: SkillChoice;

	constructor(skills: Stored<GenesysItem<'skill'>>[], choice: SkillChoice) {
		super({ window: { title: CHOICE_TEXTS[choice.kind].title } });

		this.#skills = skills;
		this.#choice = choice;
	}

	override async getVueContext(): Promise<CareerSkillPromptContext> {
		return {
			skills: this.#skills,
			count: this.#choice.kind === 'freeRanks' ? CONFIG.genesys.settings.freeCareerSkillRanks : this.#choice.count,
			hint: CHOICE_TEXTS[this.#choice.kind].hint,
		};
	}
}
