import { ContextBase } from '@/vue/SheetContext';
import { VueSheet } from '@/vue/VueSheet';
import VueSelectCharacterSkillPrompt from '@/vue/apps/SelectCharacterSkillPrompt.vue';

import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysItem } from '@/item/GenesysItem';
import { SkillDataModel } from '@/item/data/SkillDataModel';

export type CharacterSkillOption = {
	actor: GenesysActor;
	skill: GenesysItem<SkillDataModel>;
};

export interface SelectCharacterSkillPromptContext extends ContextBase {
	characterSkillOptions: CharacterSkillOption[];
	resolvePromise: (selectedOption: CharacterSkillOption) => void;
}

export class SelectCharacterSkillPrompt extends VueSheet(foundry.applications.api.ApplicationV2) {
	override get vueComponent() {
		return VueSelectCharacterSkillPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-select-character-skill-prompt'],
		position: { width: 100 },
		window: { title: 'Genesys.CharacterSkillPrompt.Title' },
	};

	static async promptFromCharactersList(characterSkillOptions: CharacterSkillOption[]) {
		const sheet = new SelectCharacterSkillPrompt(characterSkillOptions);
		await sheet.render(true);

		return new Promise<CharacterSkillOption | undefined>((resolve) => {
			sheet.#resolvePromise = resolve;
		});
	}

	readonly characterSkillOptions: CharacterSkillOption[];
	#resolvePromise?: (selectedOption?: CharacterSkillOption) => void;

	constructor(characterSkillOptions: CharacterSkillOption[]) {
		super();

		this.characterSkillOptions = characterSkillOptions;
	}

	override async getVueContext(): Promise<SelectCharacterSkillPromptContext> {
		return {
			characterSkillOptions: this.characterSkillOptions,
			resolvePromise: (selectedOption) => {
				this.#resolvePromise?.(selectedOption);
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
