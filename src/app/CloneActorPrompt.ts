import { VuePrompt } from '@/vue/VuePrompt';
import VueCloneActorPrompt from '@/vue/apps/CloneActorPrompt.vue';

import { GenesysActor } from '@/actor/GenesysActor';

/**
 * What the clone prompt shows: the actor to clone.
 */
export type CloneActorPromptContext = {
	targetActor: GenesysActor;
};

/**
 * How the user places the actor: as it is, or a clone of it.
 */
export type InstantiationMethod = 'Original' | 'Clone';

/**
 * What the clone prompt answers: how to place the actor, and the clone's name.
 */
export type Instantiation = { method: InstantiationMethod; name: string };

/**
 * Prompt the user to place an actor as it is, or a clone of it.
 */
export class CloneActorPrompt extends VuePrompt<Instantiation | undefined>(undefined) {
	override get vueComponent() {
		return VueCloneActorPrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-clone-actor-prompt'],
		position: { width: 100 },
		window: { title: 'Genesys.CloneActorPrompt.Title' },
	};

	/**
	 * Ask the user whether to place the actor or a clone of it, and under which name. Undefined when the prompt is closed.
	 */
	static async promptForInstantiation(targetActor: GenesysActor) {
		return new CloneActorPrompt(targetActor).prompt();
	}

	readonly targetActor: GenesysActor;

	constructor(targetActor: GenesysActor) {
		super();

		this.targetActor = targetActor;
	}

	override async getVueContext(): Promise<CloneActorPromptContext> {
		return { targetActor: this.targetActor };
	}
}
