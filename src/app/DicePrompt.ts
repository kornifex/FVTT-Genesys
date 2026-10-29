import { GenesysActor } from '@/actor/GenesysActor';
import { GenesysItem } from '@/item/GenesysItem';
import VueDicePrompt from '@/vue/apps/DicePrompt.vue';
import { WeaponDataModel } from '@/item/data/WeaponDataModel';
import { VehicleWeaponDataModel } from '@/item/data/VehicleWeaponDataModel';
import { VueSheet } from '@/vue/VueSheet';
import { Characteristic } from '@/data/Characteristics';
import type { CheckRoll } from '@/dice/CheckRoll';

/**
 * What the Dice Prompt rolls the check for.
 */
export const RollType = {
	Skill: 'skill',
	Attack: 'attack',
	Initiative: 'initiative',
} as const;

/**
 * A check the Dice Prompt rolls, and what its roll type needs on top of the dice pool: the weapon of an attack, the
 * promise of an initiative, settled when the check is rolled or the prompt closed.
 */
export type DicePromptRoll =
	| { type: typeof RollType.Skill }
	| { type: typeof RollType.Attack; weapon: GenesysItem<WeaponDataModel | VehicleWeaponDataModel> }
	| { type: typeof RollType.Initiative; resolve: (checkRoll: CheckRoll) => void; reject: () => void };

/**
 * What the Dice Prompt shows and rolls.
 */
export type DicePromptContext = {
	actor?: GenesysActor;
	skillName?: string;
	roll: DicePromptRoll;
	difficulty: string;
	characteristic?: Characteristic;
	app: DicePrompt;
};

export type DicePromptOptions = {
	/**
	 * The check rolled, a skill check by default.
	 */
	roll?: DicePromptRoll;
	difficulty?: string;
	/**
	 * Characteristic rolled when no skill is selected: the characteristic of a Characteristic Check, or of a skill the
	 * actor can't roll.
	 */
	characteristic?: Characteristic;
};

/**
 * Dice pool prompt.
 */
export class DicePrompt extends VueSheet(foundry.applications.api.ApplicationV2) {
	override get vueComponent() {
		return VueDicePrompt;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['app-dice-prompt'],
		position: { width: 500 },
		window: { title: 'Genesys.DicePrompt.Title' },
	};

	static async promptForRoll(actor: GenesysActor | undefined, skillName: string, options: DicePromptOptions = {}) {
		const app = new DicePrompt(actor, skillName, options);
		await app.render(true);
	}

	static async promptForCharacteristicCheck(actor: GenesysActor, characteristic: Characteristic) {
		await DicePrompt.promptForRoll(actor, '', { characteristic });
	}

	static async promptForInitiative(actor: GenesysActor, skillName: string, options: Omit<DicePromptOptions, 'roll'> = {}) {
		return new Promise<CheckRoll>((resolve, reject) => {
			const app = new DicePrompt(actor, skillName, { ...options, roll: { type: RollType.Initiative, resolve, reject } });

			void app.render(true);
		});
	}

	actor?: GenesysActor;
	skillName?: string;
	roll: DicePromptRoll;
	difficulty: string;
	characteristic?: Characteristic;

	constructor(actor?: GenesysActor, skillName?: string, { roll, difficulty, characteristic }: DicePromptOptions = {}) {
		super();

		this.actor = actor;
		this.skillName = skillName;
		this.roll = roll ?? { type: RollType.Skill };
		this.difficulty = difficulty ?? CONFIG.genesys.settings.defaultDifficulty;
		this.characteristic = characteristic;
	}

	protected override async _preClose(options: object) {
		if (this.roll.type === RollType.Initiative) {
			this.roll.reject();
		}

		await super._preClose(options);
	}

	override async getVueContext(): Promise<DicePromptContext> {
		return {
			actor: this.actor,
			skillName: this.skillName,
			roll: this.roll,
			difficulty: this.difficulty,
			characteristic: this.characteristic,
			app: this,
		};
	}
}
