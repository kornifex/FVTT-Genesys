import { GenesysItem } from '@/item/GenesysItem';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import VueCareerSkillPrompt from '@/vue/apps/CareerSkillPrompt.vue';
import { ContextBase } from '@/vue/SheetContext';
import { VueSheet } from '@/vue/VueSheet';

export interface CareerSkillPromptContext extends ContextBase {
	skills: GenesysItem<SkillDataModel>[];
	resolvePromise: (skillIDs: string[]) => void;
}

export class CareerSkillPrompt extends VueSheet(foundry.applications.api.ApplicationV2) {
	override get vueComponent() {
		return VueCareerSkillPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-career-skill-prompt'],
		position: { width: 400 },
		window: { title: 'Genesys.CareerSkillPrompt.Title' },
	};

	static async promptForSkills(skills: GenesysItem<SkillDataModel>[]): Promise<string[]> {
		const sheet = new CareerSkillPrompt(skills);
		await sheet.render(true);

		return new Promise((resolve) => {
			sheet.#resolvePromise = resolve;
		});
	}

	#resolvePromise?: (value: string[]) => void;
	readonly #skills: GenesysItem<SkillDataModel>[];

	constructor(skills: GenesysItem<SkillDataModel>[]) {
		super();

		this.#skills = skills;
	}

	override async getVueContext(): Promise<CareerSkillPromptContext> {
		return {
			resolvePromise: (skillIDs) => {
				this.#resolvePromise?.(skillIDs);
				this.#resolvePromise = undefined;

				void this.close();
			},
			skills: this.#skills,
		};
	}

	protected override async _preClose(options: object) {
		this.#resolvePromise?.([]);
		await super._preClose(options);
	}
}
