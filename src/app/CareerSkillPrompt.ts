import { GenesysItem } from '@/item/GenesysItem';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import VueCareerSkillPrompt from '@/vue/apps/CareerSkillPrompt.vue';
import { VuePrompt } from '@/vue/VuePrompt';

/**
 * What the career skill prompt shows: the skills to pick from.
 */
export type CareerSkillPromptContext = {
	skills: GenesysItem<SkillDataModel>[];
	answer: (skillIDs: string[]) => void;
};

export class CareerSkillPrompt extends VuePrompt<string[]>([]) {
	override get vueComponent() {
		return VueCareerSkillPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-career-skill-prompt'],
		position: { width: 400 },
		window: { title: 'Genesys.CareerSkillPrompt.Title' },
	};

	static async promptForSkills(skills: GenesysItem<SkillDataModel>[]) {
		return new CareerSkillPrompt(skills).prompt();
	}

	readonly #skills: GenesysItem<SkillDataModel>[];

	constructor(skills: GenesysItem<SkillDataModel>[]) {
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
