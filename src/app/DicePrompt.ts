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

export type RollType = (typeof RollType)[keyof typeof RollType];

/**
 * What the Dice Prompt shows and rolls.
 */
export type DicePromptContext = {
	actor?: GenesysActor;
	skillName?: string;
	rollType: RollType;
	difficulty: string;
	characteristic?: Characteristic;
	rollData?: RollData;
	app: DicePrompt;
};

export type AttackRollData = {
	weapon: GenesysItem<WeaponDataModel | VehicleWeaponDataModel>;
};

export type InitiativeRollData = {
	resolvePromise: (checkRoll: CheckRoll) => void;
	rejectPromise: () => void;
};

/**
 * What a roll type needs on top of the dice pool.
 */
type RollData = AttackRollData | InitiativeRollData;

export type DicePromptOptions = {
	rollType?: RollType;
	difficulty?: string;
	/**
	 * Characteristic rolled when no skill is selected: the characteristic of a Characteristic Check, or of a skill the
	 * actor can't roll.
	 */
	characteristic?: Characteristic;
	rollData?: RollData;
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

	static async promptForInitiative(actor: GenesysActor, skillName: string, options: DicePromptOptions = {}) {
		return new Promise<CheckRoll>((resolve, reject) => {
			const app = new DicePrompt(actor, skillName, {
				...options,
				rollType: RollType.Initiative,
				rollData: { resolvePromise: resolve, rejectPromise: reject },
			});

			void app.render(true);
		});
	}

	actor?: GenesysActor;
	skillName?: string;
	rollType: RollType;
	difficulty: string;
	characteristic?: Characteristic;
	rollData?: RollData;

	constructor(actor?: GenesysActor, skillName?: string, { rollType, difficulty, characteristic, rollData }: DicePromptOptions = {}) {
		super();

		this.actor = actor;
		this.skillName = skillName;
		this.rollType = rollType ?? RollType.Skill;
		this.difficulty = difficulty ?? CONFIG.genesys.settings.defaultDifficulty;
		this.characteristic = characteristic;
		this.rollData = rollData;
	}

	protected override async _preClose(options: object) {
		if (this.rollType === RollType.Initiative) {
			(this.rollData as InitiativeRollData).rejectPromise();
		}

		await super._preClose(options);
	}

	override async getVueContext(): Promise<DicePromptContext> {
		return {
			actor: this.actor,
			skillName: this.skillName,
			rollType: this.rollType,
			difficulty: this.difficulty,
			characteristic: this.characteristic,
			rollData: this.rollData,
			app: this,
		};
	}
}
