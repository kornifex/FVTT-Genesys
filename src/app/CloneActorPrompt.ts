import { VuePrompt } from '@/vue/VuePrompt';
import VueCloneActorPrompt from '@/vue/apps/CloneActorPrompt.vue';

import { GenesysActor } from '@/actor/GenesysActor';

/**
 * What the clone prompt shows: the actor to clone.
 */
export type CloneActorPromptContext = {
	targetActor: GenesysActor;
	answer: (targetActor?: GenesysActor) => void;
};

export class CloneActorPrompt extends VuePrompt<GenesysActor | undefined>(undefined) {
	override get vueComponent() {
		return VueCloneActorPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-clone-actor-prompt'],
		position: { width: 100 },
		window: { title: 'Genesys.CloneActorPrompt.Title' },
	};

	static async promptForInstantiation(targetActor: GenesysActor) {
		return new CloneActorPrompt(targetActor).prompt();
	}

	readonly targetActor: GenesysActor;

	constructor(targetActor: GenesysActor) {
		super();

		this.targetActor = targetActor;
	}

	override async getVueContext(): Promise<CloneActorPromptContext> {
		return {
			targetActor: this.targetActor,
			answer: (targetActor) => this.answer(targetActor),
		};
	}
}
