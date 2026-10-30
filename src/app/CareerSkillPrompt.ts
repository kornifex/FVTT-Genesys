import type { Stored } from '@/data/Stored';
import { GenesysItem } from '@/item/GenesysItem';
import VueCareerSkillPrompt from '@/vue/apps/CareerSkillPrompt.vue';
import { VuePrompt } from '@/vue/VuePrompt';

/**
 * What the career skill prompt shows: the skills to pick from.
 */
export type CareerSkillPromptContext = {
	skills: Stored<GenesysItem<'skill'>>[];
	answer: (skillIDs: string[]) => void;
};

/**
 * Prompt the user for the career skills that gain a free rank.
 */
export class CareerSkillPrompt extends VuePrompt<string[]>([]) {
	override get vueComponent() {
		return VueCareerSkillPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-career-skill-prompt'],
		position: { width: 400 },
		window: { title: 'Genesys.CareerSkillPrompt.Title' },
	};

	/**
	 * Ask the user to pick career skills, by their IDs. None when the prompt is closed.
	 */
	static async promptForSkills(skills: Stored<GenesysItem<'skill'>>[]) {
		return new CareerSkillPrompt(skills).prompt();
	}

	readonly #skills: Stored<GenesysItem<'skill'>>[];

	constructor(skills: Stored<GenesysItem<'skill'>>[]) {
		super();

		this.#skills = skills;
	}

	override async getVueContext(): Promise<CareerSkillPromptContext> {
		return {
			answer: (skillIDs) => this.answer(skillIDs),
			skills: this.#skills,
		};
	}
}
