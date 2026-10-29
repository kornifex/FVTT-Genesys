import { VueSheet } from '@/vue/VueSheet';
import VueCloneActorPrompt from '@/vue/apps/CloneActorPrompt.vue';

import { GenesysActor } from '@/actor/GenesysActor';

/**
 * What the clone prompt shows: the actor to clone.
 */
export type CloneActorPromptContext = {
	targetActor: GenesysActor;
	resolvePromise: (targetActor?: GenesysActor) => void;
};

export class CloneActorPrompt extends VueSheet(foundry.applications.api.ApplicationV2) {
	override get vueComponent() {
		return VueCloneActorPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-clone-actor-prompt'],
		position: { width: 100 },
		window: { title: 'Genesys.CloneActorPrompt.Title' },
	};

	static async promptForInstantiation(targetActor: GenesysActor) {
		const sheet = new CloneActorPrompt(targetActor);
		await sheet.render(true);

		return new Promise<GenesysActor | undefined>((resolve) => {
			sheet.#resolvePromise = resolve;
		});
	}

	readonly targetActor: GenesysActor;
	#resolvePromise?: (targetActor?: GenesysActor) => void;

	constructor(targetActor: GenesysActor) {
		super();

		this.targetActor = targetActor;
	}

	override async getVueContext(): Promise<CloneActorPromptContext> {
		return {
			targetActor: this.targetActor,
			resolvePromise: (targetActor) => {
				this.#resolvePromise?.(targetActor);
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
